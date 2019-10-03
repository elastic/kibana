/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError } from 'vscode-jsonrpc';
import { LanguageServerStartFailed } from '../../common/lsp_error_codes';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { ILanguageServerLauncher } from './language_server_launcher';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';
import { ControlledProgram } from './process/controlled_program';

let seqNo = 1;

export abstract class AbstractLauncher implements ILanguageServerLauncher {
  running: boolean = false;
  private currentPid: number = -1;
  private child: ControlledProgram | null = null;
  private startTime: number = -1;
  private proxyConnected: boolean = false;
  protected readonly log: Logger;
  private spawnTimes: number = 0;
  private launchReject?: (reason?: any) => void;
  launchFailed: boolean = false;
  protected constructor(
    readonly name: string,
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    this.log = this.loggerFactory.getLogger([`${seqNo++}`, `${this.name}`, 'code']);
  }

  public async launch(builtinWorkspace: boolean, maxWorkspace: number) {
    const port = await this.getPort();
    const log: Logger = this.log;
    const proxy = new LanguageServerProxy(port, this.targetHost, log);
    if (this.options.lsp.detach) {
      log.debug('Detach mode, expected language server launch externally');
      proxy.onConnected(() => {
        this.running = true;
      });
      proxy.onDisconnected(() => {
        this.running = false;
        if (!proxy.isClosed) {
          log.debug(`${this.name} language server disconnected, reconnecting`);
          setTimeout(() => this.reconnect(proxy), 1000);
        }
      });
    } else {
      const child = await this.doSpawnProcess(port, log);
      this.onProcessExit(child, () => {
        if (!proxy.isClosed) this.reconnect(proxy);
      });
      proxy.onDisconnected(async () => {
        this.proxyConnected = false;
        if (!proxy.isClosed) {
          log.debug('proxy disconnected, reconnecting');
          setTimeout(async () => {
            await this.reconnect(proxy, child);
          }, 1000);
        } else if (this.child) {
          log.info('proxy closed, kill process');
          await this.killProcess(child);
        }
      });
      this.child = child;
    }
    proxy.onExit(() => {
      log.debug('proxy exited, is the program running? ' + this.running);
      if (this.child && this.running) {
        const p = this.child!;
        this.killProcess(p);
      }
    });
    this.startConnect(proxy);
    await new Promise((resolve, reject) => {
      proxy.onConnected(() => {
        this.proxyConnected = true;
        resolve();
      });
      this.launchReject = err => {
        log.debug('launch error ' + err);
        proxy.exit().catch(this.log.debug);
        reject(err);
      };
    });

    return this.createExpander(proxy, builtinWorkspace, maxWorkspace);
  }

  private onProcessExit(child: ControlledProgram, reconnectFn: () => void) {
    const pid = child.pid;
    child.onExit(() => {
      if (this.currentPid === pid) {
        this.running = false;
        // if the process exited before proxy connected, then we reconnect
        if (!this.proxyConnected) {
          reconnectFn();
        }
      }
    });
  }

  /**
   * proxy should be connected within this timeout, otherwise we reconnect.
   */
  protected startupTimeout = 10000;

  protected maxRespawn = 3;

  /**
   * try reconnect the proxy when disconnected
   */
  public async reconnect(proxy: LanguageServerProxy, child?: ControlledProgram) {
    this.log.debug('reconnecting');
    if (this.options.lsp.detach) {
      this.startConnect(proxy);
    } else {
      const processExpired = () => Date.now() - this.startTime > this.startupTimeout;
      if (child && !child.killed() && !processExpired()) {
        this.startConnect(proxy);
      } else {
        if (this.spawnTimes < this.maxRespawn) {
          if (child && this.running) {
            this.log.debug('killing the old program.');
            await this.killProcess(child);
          }
          const port = await this.getPort();
          proxy.changePort(port);
          this.child = await this.doSpawnProcess(port, this.log);
          this.onProcessExit(this.child, () => this.reconnect(proxy, child));
          this.startConnect(proxy);
        } else {
          const ServerStartFailed = new ResponseError(
            LanguageServerStartFailed,
            'Launch language server failed.'
          );
          this.launchReject!(ServerStartFailed);
          this.launchFailed = true;
          proxy.setError(ServerStartFailed);
          this.log.warn(`spawned program ${this.spawnTimes} times, mark this proxy unusable.`);
        }
      }
    }
  }

  private async doSpawnProcess(port: number, log: Logger): Promise<ControlledProgram> {
    this.log.debug('start program');
    const child = await this.spawnProcess(port, log);
    this.currentPid = child.pid;
    this.spawnTimes += 1;
    this.startTime = Date.now();
    this.running = true;
    return child;
  }

  abstract async getPort(): Promise<number>;

  startConnect(proxy: LanguageServerProxy) {
    proxy.connect();
  }

  /**
   * await for proxy connected, create a request expander
   * @param proxy
   * @param builtinWorkspace
   * @param maxWorkspace
   */
  abstract createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander;

  abstract async spawnProcess(port: number, log: Logger): Promise<ControlledProgram>;

  protected killProcess(child: ControlledProgram) {
    if (!child.killed()) {
      return new Promise<boolean>((resolve, reject) => {
        // if not killed within 1s
        const t = setTimeout(reject, 1000);
        child.onExit(() => {
          clearTimeout(t);
          resolve(true);
        });
        child.kill(false);
      })
        .catch(() => {
          // force kill
          child.kill(true);
          return child.killed();
        })
        .finally(() => {
          if (this.currentPid === child.pid) this.running = false;
        });
    }
  }
}
