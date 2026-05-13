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

import type {
  IngestHubServerPluginSetup,
  IngestHubServerPluginStart,
  IngestHubServerPluginSetupDependencies,
  IngestHubServerPluginStartDependencies,
} from './types';

export class IngestHubServerPlugin
  implements
    Plugin<
      IngestHubServerPluginSetup,
      IngestHubServerPluginStart,
      IngestHubServerPluginSetupDependencies,
      IngestHubServerPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<IngestHubServerPluginStartDependencies, IngestHubServerPluginStart>,
    plugins: IngestHubServerPluginSetupDependencies
  ): IngestHubServerPluginSetup {
    this.logger.debug('ingestHub server: Setup');
    return {};
  }

  public start(core: CoreStart): IngestHubServerPluginStart {
    this.logger.debug('ingestHub server: Started');
    return {};
  }

  public stop() {}
}
