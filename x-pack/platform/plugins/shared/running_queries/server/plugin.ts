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
  RunningQueriesServerSetup,
  RunningQueriesServerSetupDependencies,
  RunningQueriesServerStart,
} from './types';
import { registerRoutes } from './routes';
import { runningQueriesFeature } from './running_queries_feature';

export class RunningQueriesPlugin
  implements
    Plugin<
      RunningQueriesServerSetup,
      RunningQueriesServerStart,
      RunningQueriesServerSetupDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: RunningQueriesServerSetupDependencies
  ): RunningQueriesServerSetup {
    this.logger.debug('runningQueries: Setup');

    core.capabilities.registerProvider(() => ({
      management: {
        insightsAndAlerting: {
          running_queries: true,
        },
      },
    }));

    plugins.features.registerKibanaFeature(runningQueriesFeature);

    const router = core.http.createRouter();
    registerRoutes({ router, logger: this.logger });

    return {};
  }

  public start(core: CoreStart): RunningQueriesServerStart {
    this.logger.debug('runningQueries: Started');
    return {};
  }

  public stop(): void {}
}
