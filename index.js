import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import cors from "cors"; // Import the cors package

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;
let connectedUsers = new Set(); // Store connected usernames
const __dirname = dirname(fileURLToPath(import.meta.url));

const allowedOrigins = [
  "http://localhost",
  "http://192.168.1.11",
  "http://socket-io-demo.mrwhoknows.com",
  "*", // TODO remove
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  }),
);

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected");
  // Handle user addition
  socket.on("add user", (username) => {
    if (!username) {
      return;
    }
    connectedUsers.add(username);
    socket.username = username;
    // Broadcast user joined message
    socket.broadcast.emit("user joined", {
      username,
      numUsers: connectedUsers.size,
    });
    // Send current user count and username to the connected user
    socket.emit("login", { numUsers: connectedUsers.size });
  });

  // Handle new message
  socket.on("new message", (data) => {
    if (!data || !socket.username) {
      return; // Handle invalid message or missing username
    }
    console.log(`New message from ${socket.username}: ${data}`);
    io.emit("new message", { username: socket.username, message: data });
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    if (!socket.username) {
      return; // Handle disconnect without username
    }
    connectedUsers.delete(socket.username);
    console.log(`${socket.username} disconnected`);
    // Broadcast user left message
    socket.broadcast.emit("user left", {
      username: socket.username,
      numUsers: connectedUsers.size,
    });
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
