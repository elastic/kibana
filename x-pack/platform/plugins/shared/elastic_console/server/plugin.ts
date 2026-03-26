/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ElasticConsolePluginSetup,
  ElasticConsolePluginStart,
  ElasticConsoleSetupDependencies,
  ElasticConsoleStartDependencies,
} from './types';
import { registerUiSettings } from './ui_settings';
import { registerRoutes } from './routes';

export class ElasticConsolePlugin
  implements
    Plugin<
      ElasticConsolePluginSetup,
      ElasticConsolePluginStart,
      ElasticConsoleSetupDependencies,
      ElasticConsoleStartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>,
    setupDeps: ElasticConsoleSetupDependencies
  ): ElasticConsolePluginSetup {
    registerUiSettings(coreSetup);

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
      cloud: setupDeps.cloud,
    });

    return {};
  }

  start(_core: CoreStart): ElasticConsolePluginStart {
    return {};
  }

  stop() {}
}
