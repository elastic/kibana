/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { ILanguageServerHandler } from './proxy';

export interface ILanguageServerLauncher {
  running: boolean;
  launch(
    builtinWorkspace: boolean,
    maxWorkspace: number,
    installationPath?: string
  ): Promise<ILanguageServerHandler>;
}

export type LauncherConstructor = new (
  targetHost: string,
  options: ServerOptions,
  loggerFactory: LoggerFactory
) => ILanguageServerLauncher;
