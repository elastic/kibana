/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getPort from 'get-port';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { LanguageServerProxy } from './proxy';
import { Logger } from '../log';
import { RequestExpander } from './request_expander';
import { AbstractLauncher } from './abstract_launcher';
import { EmbedCtagServer } from './process/embed_ctag_server';

const CTAGS_LANG_DETACH_PORT = 2092;
export class CtagsLauncher extends AbstractLauncher {
  private isRunning: boolean = false;
  private embed: EmbedCtagServer | null = null;
  constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    super('ctags', targetHost, options, loggerFactory);
  }
  public get running(): boolean {
    return this.isRunning;
  }

  createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander {
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options, {}, this.log);
  }

  startConnect(proxy: LanguageServerProxy) {
    proxy.startServerConnection();
    if (this.embed) {
      this.embed.start().catch(err => this.log.error(err));
    }
  }

  async getPort(): Promise<number> {
    if (!this.options.lsp.detach) {
      return await getPort();
    }
    return CTAGS_LANG_DETACH_PORT;
  }

  async spawnProcess(port: number, log: Logger) {
    if (!this.embed) {
      this.embed = new EmbedCtagServer(port, log);
    }
    return this.embed;
  }
}
