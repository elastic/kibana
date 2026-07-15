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
  QueryActivityServerSetup,
  QueryActivityServerSetupDependencies,
  QueryActivityServerStart,
} from './types';
import { registerRoutes } from './routes';
import { queryActivityFeature } from './query_activity_feature';
import { uiSettings } from './ui_settings';

export class QueryActivityPlugin
  implements
    Plugin<
      QueryActivityServerSetup,
      QueryActivityServerStart,
      QueryActivityServerSetupDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: QueryActivityServerSetupDependencies
  ): QueryActivityServerSetup {
    this.logger.debug('queryActivity: Setup');

    core.capabilities.registerProvider(() => ({
      management: {
        clusterPerformance: {
          queryActivity: true,
        },
      },
    }));

    plugins.features.registerKibanaFeature(queryActivityFeature);

    core.uiSettings.register(uiSettings);

    const router = core.http.createRouter();
    registerRoutes({ router, logger: this.logger });

    return {};
  }

  public start(core: CoreStart): QueryActivityServerStart {
    this.logger.debug('queryActivity: Started');
    return {};
  }

  public stop(): void {}
}
