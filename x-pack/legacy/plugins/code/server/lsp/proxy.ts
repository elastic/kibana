/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import EventEmitter from 'events';
import * as net from 'net';
import { fileURLToPath } from 'url';
import {
  createMessageConnection,
  MessageConnection,
  SocketMessageReader,
  SocketMessageWriter,
} from 'vscode-jsonrpc';
import { ResponseError, ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import {
  ClientCapabilities,
  ExitNotification,
  InitializedNotification,
  InitializeResult,
  LogMessageNotification,
  MessageType,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol/lib/main';

import { LspRequest } from '../../model';
import { Logger } from '../log';
import { InternalError, RequestCancelled } from '../../common/lsp_error_codes';
import { InitializeOptions, WorkspaceStatus } from './request_expander';

export interface ILanguageServerHandler {
  lastAccess?: number;
  handleRequest(request: LspRequest): Promise<ResponseMessage>;
  exit(): Promise<any>;
  unloadWorkspace(workspaceDir: string): Promise<void>;
  initializeState?(
    workspaceDir: string
  ): Promise<{ [lang: string]: WorkspaceStatus }> | WorkspaceStatus;
}

export class LanguageServerProxy implements ILanguageServerHandler {
  private error: any | null = null;
  public get isClosed() {
    return this.closed;
  }

  public initialized: boolean = false;
  private socket: any;
  private clientConnection: MessageConnection | null = null;
  private closed: boolean = false;
  private readonly targetHost: string;
  private targetPort: number;
  private readonly logger: Logger;
  private eventEmitter = new EventEmitter();
  private currentServer: net.Server | null = null;
  private listeningPort: number | null = null;

  constructor(targetPort: number, targetHost: string, logger: Logger) {
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.logger = logger;
  }

  public async handleRequest(request: LspRequest): Promise<ResponseMessage> {
    const response: ResponseMessage = {
      jsonrpc: '',
      id: null,
    };

    const conn = await this.connected();
    const params = Array.isArray(request.params) ? request.params : [request.params];
    if (!request.isNotification) {
      const file = request.documentUri || request.workspacePath;
      this.logger.debug(`sending request ${request.method} for ${file}`);
      response.result = await conn.sendRequest(request.method, ...params);
      this.logger.debug(`request ${request.method} for ${file} done.`);
    } else {
      conn.sendNotification(request.method, ...params);
    }
    return response;
  }

  public connected(): Promise<MessageConnection> {
    if (this.closed) {
      return Promise.reject(new ResponseError(RequestCancelled, 'Server closed'));
    } else if (this.error) {
      return Promise.reject(new ResponseError(InternalError, 'Server error', this.error));
    } else if (this.clientConnection) {
      return Promise.resolve(this.clientConnection);
    } else {
      return new Promise<MessageConnection>((resolve, reject) => {
        this.eventEmitter.on('err', error =>
          reject(new ResponseError(InternalError, 'Server error', error))
        );
        this.eventEmitter.on('exit', () =>
          reject(new ResponseError(RequestCancelled, 'Server closed'))
        );
        this.eventEmitter.on('connect', () => resolve(this.clientConnection!));
      });
    }
  }

  public async initialize(
    clientCapabilities: ClientCapabilities,
    workspaceFolders: [WorkspaceFolder],
    initOptions?: InitializeOptions
  ): Promise<InitializeResult> {
    if (this.error) {
      throw this.error;
    }
    const clientConn = await this.connected();
    const rootUri = workspaceFolders[0].uri;
    if (
      initOptions &&
      initOptions.clientCapabilities &&
      Object.keys(clientCapabilities).length === 0
    ) {
      clientCapabilities = initOptions.clientCapabilities;
    }
    const params = {
      processId: null,
      workspaceFolders,
      rootUri,
      capabilities: clientCapabilities,
      rootPath: fileURLToPath(rootUri),
    };
    this.logger.debug(`sending initialize for ${params.rootPath}`);
    return await clientConn
      .sendRequest(
        'initialize',
        initOptions && initOptions.initialOptions
          ? { ...params, initializationOptions: initOptions.initialOptions }
          : params
      )
      .then(r => {
        this.logger.info(`initialized at ${rootUri}`);

        // @ts-ignore
        // TODO fix this
        clientConn.sendNotification(InitializedNotification.type, {});
        this.initialized = true;
        return r as InitializeResult;
      });
  }

  public async shutdown() {
    const clientConn = await this.connected();
    this.logger.info(`sending shutdown request`);
    return await clientConn.sendRequest('shutdown');
  }
  /**
   * send a exit request to Language Server
   * https://microsoft.github.io/language-server-protocol/specification#exit
   */
  public async exit() {
    this.closed = true; // stop the socket reconnect
    if (this.clientConnection) {
      this.logger.info('sending `shutdown` request to language server.');
      const clientConn = this.clientConnection;
      clientConn.sendRequest('shutdown');
      this.logger.info('sending `exit` notification to language server.');
      // @ts-ignore
      clientConn.sendNotification(ExitNotification.type);
    }
    this.eventEmitter.emit('exit');
  }

  public startServerConnection() {
    // prevent calling this method multiple times which may cause 'port already in use' error
    if (this.currentServer) {
      if (this.listeningPort === this.targetPort) {
        return;
      } else {
        this.currentServer!.close();
      }
    }
    const server = net.createServer(socket => {
      this.initialized = false;
      server.close();
      this.currentServer = null;
      socket.on('close', () => this.onSocketClosed());
      this.eventEmitter.off('changePort', server.close);
      this.logger.info('langserver connection established on port ' + this.targetPort);
      const reader = new SocketMessageReader(socket);
      const writer = new SocketMessageWriter(socket);
      this.clientConnection = createMessageConnection(reader, writer, this.logger);
      this.registerOnNotificationHandler(this.clientConnection);
      this.clientConnection.listen();
      this.eventEmitter.emit('connect');
    });
    server.on('error', this.setError);
    const port = this.targetPort;
    server.listen(port, () => {
      this.listeningPort = port;
      this.currentServer = server;
      server.removeListener('error', this.setError);
      this.logger.info('Wait langserver connection on port ' + this.targetPort);
    });
  }

  /**
   * get notification when proxy's socket disconnect
   * @param listener
   */
  public onDisconnected(listener: () => void) {
    this.eventEmitter.on('close', listener);
  }

  public onExit(listener: () => void) {
    this.eventEmitter.on('exit', listener);
  }

  /**
   * get notification when proxy's socket connect
   * @param listener
   */
  public onConnected(listener: () => void) {
    this.eventEmitter.on('connect', listener);
  }

  public connect() {
    this.logger.debug('connecting');
    this.socket = new net.Socket();

    this.socket.on('connect', () => {
      const reader = new SocketMessageReader(this.socket);
      const writer = new SocketMessageWriter(this.socket);
      this.clientConnection = createMessageConnection(reader, writer, this.logger);
      this.registerOnNotificationHandler(this.clientConnection);
      this.clientConnection.listen();
      this.eventEmitter.emit('connect');
    });

    this.socket.on('close', () => this.onSocketClosed());

    this.socket.on('error', () => void 0);
    this.socket.on('timeout', () => void 0);
    this.socket.on('drain', () => void 0);
    this.socket.connect(this.targetPort, this.targetHost);
  }

  public unloadWorkspace(workspaceDir: string): Promise<void> {
    return Promise.reject('should not hit here');
  }

  private onSocketClosed() {
    this.clientConnection = null;
    this.eventEmitter.emit('close');
  }

  private registerOnNotificationHandler(clientConnection: MessageConnection) {
    // @ts-ignore
    clientConnection.onNotification(LogMessageNotification.type, notification => {
      switch (notification.type) {
        case MessageType.Log:
          this.logger.debug(notification.message);
          break;
        case MessageType.Info:
          this.logger.debug(notification.message);
          break;
        case MessageType.Warning:
          this.logger.warn(notification.message);
          break;
        case MessageType.Error:
          this.logger.error(notification.message);
          break;
      }
    });
  }

  public changePort(port: number) {
    if (port !== this.targetPort) {
      this.targetPort = port;
    }
  }

  public setError(error: any) {
    this.error = error;
    this.eventEmitter.emit('err', error);
  }
}
