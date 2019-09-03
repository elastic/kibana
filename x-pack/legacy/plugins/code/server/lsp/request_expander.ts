/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ResponseError, ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import {
  ClientCapabilities,
  DidChangeWorkspaceFoldersParams,
  InitializeResult,
} from 'vscode-languageserver-protocol';
import { RequestCancelled } from '../../common/lsp_error_codes';
import { LspRequest } from '../../model';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { Cancelable } from '../utils/cancelable';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

interface Job {
  request: LspRequest;
  resolve: (response: ResponseMessage) => void;
  reject: (error: any) => void;
  startTime: number;
}

export enum WorkspaceStatus {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Initialized = 'Initialized',
}

interface Workspace {
  lastAccess: number;
  status: WorkspaceStatus;
  initPromise?: Cancelable<any>;
}

export interface InitializeOptions {
  clientCapabilities?: ClientCapabilities;
  initialOptions?: object;
}

export const WorkspaceUnloadedError = new ResponseError(RequestCancelled, 'Workspace unloaded');

export class RequestExpander implements ILanguageServerHandler {
  public lastAccess: number = 0;
  private proxy: LanguageServerProxy;
  private jobQueue: Job[] = [];
  // a map for workspacePath -> Workspace
  private workspaces: Map<string, Workspace> = new Map();
  private readonly workspaceRoot: string;
  private running = false;
  private exited = false;

  constructor(
    proxy: LanguageServerProxy,
    readonly builtinWorkspace: boolean,
    readonly maxWorkspace: number,
    readonly serverOptions: ServerOptions,
    readonly initialOptions: InitializeOptions,
    readonly log: Logger
  ) {
    this.proxy = proxy;
    this.handle = this.handle.bind(this);
    proxy.onDisconnected(() => {
      this.workspaces.clear();
    });
    this.workspaceRoot = fs.realpathSync(this.serverOptions.workspacePath);
  }

  public handleRequest(request: LspRequest): Promise<ResponseMessage> {
    this.lastAccess = Date.now();
    return new Promise<ResponseMessage>((resolve, reject) => {
      if (this.exited) {
        reject(new Error('proxy is exited.'));
        return;
      }
      this.jobQueue.push({
        request,
        resolve,
        reject,
        startTime: Date.now(),
      });
      this.log.debug(`queued  a ${request.method} job for workspace ${request.workspacePath}`);
      if (!this.running) {
        this.running = true;
        this.handleNext();
      }
    });
  }

  public async exit() {
    this.exited = true;
    this.running = false;
    this.log.debug(`exiting proxy`);
    return this.proxy.exit();
  }

  public async unloadWorkspace(workspacePath: string) {
    this.log.debug('unload workspace ' + workspacePath);
    if (this.hasWorkspacePath(workspacePath)) {
      const ws = this.getWorkspace(workspacePath);
      if (ws.initPromise) {
        ws.initPromise.cancel(WorkspaceUnloadedError);
      }
      if (this.builtinWorkspace) {
        const params: DidChangeWorkspaceFoldersParams = {
          event: {
            removed: [
              {
                name: workspacePath!,
                uri: pathToFileURL(workspacePath).href,
              },
            ],
            added: [],
          },
        };
        await this.proxy.handleRequest({
          method: 'workspace/didChangeWorkspaceFolders',
          params,
          isNotification: true,
        });
      } else {
        await this.exit();
      }
    }
    this.removeWorkspace(workspacePath);
    const newJobQueue: Job[] = [];
    this.jobQueue.forEach(job => {
      if (job.request.workspacePath === workspacePath) {
        job.reject(WorkspaceUnloadedError);
        this.log.debug(`canceled a ${job.request.method} job because of unload workspace`);
      } else {
        newJobQueue.push(job);
      }
    });
    this.jobQueue = newJobQueue;
  }

  public async initialize(workspacePath: string): Promise<void | InitializeResult> {
    this.updateWorkspace(workspacePath);
    const ws = this.getWorkspace(workspacePath);
    ws.status = WorkspaceStatus.Initializing;

    try {
      if (this.builtinWorkspace) {
        if (this.proxy.initialized) {
          await this.changeWorkspaceFolders(workspacePath, this.maxWorkspace);
        } else {
          // this is the first workspace, init the lsp server first
          await this.sendInitRequest(workspacePath);
        }
        ws.status = WorkspaceStatus.Initialized;
        delete ws.initPromise;
      } else {
        for (const w of this.workspaces.values()) {
          if (w.status === WorkspaceStatus.Initialized) {
            await this.proxy.shutdown();
            this.workspaces.clear();
            break;
          }
        }
        const response = await this.sendInitRequest(workspacePath);
        ws.status = WorkspaceStatus.Initialized;
        return response;
      }
    } catch (e) {
      ws.status = WorkspaceStatus.Uninitialized;
      throw e;
    }
  }

  private async sendInitRequest(workspacePath: string) {
    return await this.proxy.initialize(
      {},
      [
        {
          name: workspacePath,
          uri: pathToFileURL(workspacePath).href,
        },
      ],
      this.initialOptions
    );
  }

  private handle() {
    const job = this.jobQueue.shift();
    if (job && !this.exited) {
      this.log.debug('dequeue a job');
      const { request, resolve, reject } = job;
      this.expand(request, job.startTime).then(
        value => {
          try {
            resolve(value);
          } finally {
            this.handleNext();
          }
        },
        err => {
          try {
            this.log.error(err);
            reject(err);
          } finally {
            this.handleNext();
          }
        }
      );
    } else {
      this.running = false;
    }
  }

  private handleNext() {
    setTimeout(this.handle, 0);
  }

  private async expand(request: LspRequest, startTime: number): Promise<ResponseMessage> {
    if (request.workspacePath) {
      const ws = this.getWorkspace(request.workspacePath);
      if (ws.status === WorkspaceStatus.Uninitialized) {
        ws.initPromise = Cancelable.fromPromise(this.initialize(request.workspacePath));
      }
      // Uninitialized or initializing
      if (ws.status === WorkspaceStatus.Initializing) {
        await ws.initPromise!.promise;
      }
    }
    return await this.proxy.handleRequest(request);
  }

  /**
   * use DidChangeWorkspaceFolders notification add a new workspace folder
   * replace the oldest one if count > maxWorkspace
   * builtinWorkspace = false is equal to maxWorkspace =1
   * @param workspacePath
   * @param maxWorkspace
   */
  private async changeWorkspaceFolders(workspacePath: string, maxWorkspace: number): Promise<void> {
    const params: DidChangeWorkspaceFoldersParams = {
      event: {
        added: [
          {
            name: workspacePath!,
            uri: pathToFileURL(workspacePath).href,
          },
        ],
        removed: [],
      },
    };
    this.updateWorkspace(workspacePath);

    if (this.workspaces.size > this.maxWorkspace) {
      let oldestWorkspace;
      let oldestAccess = Number.MAX_VALUE;
      for (const [workspace, ws] of this.workspaces) {
        if (ws.lastAccess < oldestAccess) {
          oldestAccess = ws.lastAccess;
          oldestWorkspace = path.join(this.serverOptions.workspacePath, workspace);
        }
      }
      if (oldestWorkspace) {
        params.event.removed.push({
          name: oldestWorkspace,
          uri: pathToFileURL(oldestWorkspace).href,
        });
        this.removeWorkspace(oldestWorkspace);
      }
    }
    // adding a workspace folder may also need initialize
    await this.proxy.handleRequest({
      method: 'workspace/didChangeWorkspaceFolders',
      params,
      isNotification: true,
    });
  }

  private removeWorkspace(workspacePath: string) {
    this.workspaces.delete(this.relativePath(workspacePath));
  }

  private updateWorkspace(workspacePath: string) {
    this.getWorkspace(workspacePath).lastAccess = Date.now();
  }

  private hasWorkspacePath(workspacePath: string) {
    return this.workspaces.has(this.relativePath(workspacePath));
  }

  /**
   * use a relative path to prevent bugs due to symbolic path
   * @param workspacePath
   */
  private relativePath(workspacePath: string) {
    const realPath = fs.realpathSync(workspacePath);
    return path.relative(this.workspaceRoot, realPath);
  }

  private getWorkspace(workspacePath: string): Workspace {
    const p = this.relativePath(workspacePath);
    let ws = this.workspaces.get(p);
    if (!ws) {
      ws = {
        status: WorkspaceStatus.Uninitialized,
        lastAccess: Date.now(),
      };
      this.workspaces.set(p, ws);
    }
    return ws;
  }

  initializeState(workspaceDir: string): WorkspaceStatus {
    if (this.hasWorkspacePath(workspaceDir)) {
      return this.getWorkspace(workspaceDir).status;
    }
    return WorkspaceStatus.Uninitialized;
  }
}
