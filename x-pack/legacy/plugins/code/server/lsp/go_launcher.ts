/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess } from 'child_process';
import getPort from 'get-port';
import { Logger, MarkupKind } from 'vscode-languageserver-protocol';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { AbstractLauncher } from './abstract_launcher';
import { LanguageServerProxy } from './proxy';
import { InitializeOptions, RequestExpander } from './request_expander';

const GO_LANG_DETACH_PORT = 2091;

export class GoServerLauncher extends AbstractLauncher {
  public constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    super('go', targetHost, options, loggerFactory);
  }

  async getPort() {
    if (!this.options.lsp.detach) {
      return await getPort();
    }
    return GO_LANG_DETACH_PORT;
  }

  createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander {
    return new RequestExpander(
      proxy,
      builtinWorkspace,
      maxWorkspace,
      this.options,
      {
        clientCapabilities: {
          textDocument: {
            hover: {
              contentFormat: [MarkupKind.Markdown, MarkupKind.PlainText],
            },
          },
        },
      } as InitializeOptions,
      this.log
    );
  }
  // TODO(henrywong): Once go langugage server ready to release, we should support this mode.
  async spawnProcess(installationPath: string, port: number, log: Logger): Promise<ChildProcess> {
    throw new Error('Go language server currently only support detach mode');
  }
}
