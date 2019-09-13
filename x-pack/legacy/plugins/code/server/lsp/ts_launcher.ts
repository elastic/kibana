/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spawn } from 'child_process';
import getPort from 'get-port';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { AbstractLauncher } from './abstract_launcher';
import { LanguageServerProxy } from './proxy';
import { InitializeOptions, RequestExpander } from './request_expander';
import { ExternalProgram } from './process/external_program';
import { ControlledProgram } from './process/controlled_program';

const TS_LANG_DETACH_PORT = 2089;

export class TypescriptServerLauncher extends AbstractLauncher {
  constructor(
    readonly targetHost: string,
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory,
    readonly installationPath: string
  ) {
    super('typescript', targetHost, options, loggerFactory);
  }

  async getPort() {
    if (!this.options.lsp.detach) {
      return await getPort();
    }
    return TS_LANG_DETACH_PORT;
  }

  protected startupTimeout = 5000;

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
        initialOptions: {
          installNodeDependency: this.options.security.installNodeDependency,
          gitHostWhitelist: this.options.security.gitHostWhitelist,
        },
      } as InitializeOptions,
      this.log
    );
  }
  async spawnProcess(port: number, log: Logger): Promise<ControlledProgram> {
    const p = spawn(process.execPath, [this.installationPath, '-p', port.toString(), '-c', '1'], {
      detached: false,
      stdio: 'pipe',
    });
    p.stdout.on('data', data => {
      log.stdout(data.toString());
    });
    p.stderr.on('data', data => {
      log.stderr(data.toString());
    });
    return new ExternalProgram(p, this.options, log);
  }
}
