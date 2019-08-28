/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable */
// This file is used in the test, using subprocess.fork to load a module directly, so this module can not be typescript
const net = require('net');
const jsonrpc = require('vscode-jsonrpc');
const createMessageConnection = jsonrpc.createMessageConnection;
const SocketMessageReader = jsonrpc.SocketMessageReader;
const SocketMessageWriter = jsonrpc.SocketMessageWriter;

function log(msg) {
    if (process.send) {
        process.send(msg);
    }
    else {
        // eslint-disable-next-line no-console
        console.log(msg);
    }
}
class MockLangServer {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.connection = null;
        this.shutdown = false;
    }
    /**
     * connect remote server as a client
     */
    connect() {
        this.socket = new net.Socket();
        this.socket.on('connect', () => {
            const reader = new SocketMessageReader(this.socket);
            const writer = new SocketMessageWriter(this.socket);
            this.connection = createMessageConnection(reader, writer);
            this.connection.listen();
            this.connection.onNotification(this.onNotification.bind(this));
            this.connection.onRequest(this.onRequest.bind(this));
            log('socket connected');
        });
        this.socket.on('close', () => this.onSocketClosed());
        log('start connecting');
        this.socket.connect(this.port, this.host);
    }
    listen() {
        const server = net.createServer(socket => {
            server.close();
            socket.on('close', () => this.onSocketClosed());
            const reader = new SocketMessageReader(socket);
            const writer = new SocketMessageWriter(socket);
            this.connection = createMessageConnection(reader, writer);
            this.connection.onNotification(this.onNotification.bind(this));
            this.connection.onRequest(this.onRequest.bind(this));
            this.connection.listen();
            log('socket connected');
        });
        server.on('error', err => {
            log(err);
        });
        log('start listening');
        server.listen(this.port);
    }
    onNotification(method, ...params) {
        log({ method, params });
        // notify parent process what happened
        if (method === 'exit') {
            // https://microsoft.github.io/language-server-protocol/specification#exit
            if (options.noExit) {
                log('noExit');
            }
            else {
                const code = this.shutdown ? 0 : 1;
                log(`exit process with code ${code}`);
                process.exit(code);
            }
        }
    }
    onRequest(method, ...params) {
        // notify parent process what requested
        log({ method, params });
        if (method === 'shutdown') {
            this.shutdown = true;
        }
        return { result: 'ok' };
    }
    onSocketClosed() {
        // notify parent process that socket closed
        log('socket closed');
    }
}
log('process started');
let port = 9999;
let host = ' localhost';
const options = { noExit: false };
let langServer;
process.on('message', (msg) => {
    const [cmd, value] = msg.split(' ');
    switch (cmd) {
        case 'port':
            port = parseInt(value, 10);
            break;
        case 'host':
            host = value;
            break;
        case 'noExit':
            options.noExit = true;
            break;
        case 'listen':
            langServer = new MockLangServer(host, port);
            langServer.listen();
            break;
        case 'connect':
            langServer = new MockLangServer(host, port);
            langServer.connect();
            break;
        case 'quit':
            process.exit(0);
            break;
        default:
        // nothing to do
    }
});
