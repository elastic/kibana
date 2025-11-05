/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

export interface CloudConnectedPluginSetup {}

export interface CloudConnectedPluginStart {}

export class CloudConnectedPlugin
  implements Plugin<CloudConnectedPluginSetup, CloudConnectedPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): CloudConnectedPluginSetup {
    this.logger.debug('cloudConnected: Setup');
    return {};
  }

  public start(core: CoreStart): CloudConnectedPluginStart {
    this.logger.debug('cloudConnected: Started');
    return {};
  }

  public stop() {}
}
