/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';

import type {
  AlertingServerSetup,
  AlertingServerStart,
  AlertingServerSetupDependencies,
  AlertingServerStartDependencies,
} from './types';
import type { AlertingV2Config } from './config';
import { setupSavedObjects } from './saved_objects';
import { initializeEsqlRulesTaskDefinition } from './esql_task';
import { registerEsqlRuleRoutes } from './routes/esql_rule';

export class AlertingPlugin
  implements
    Plugin<
      AlertingServerSetup,
      AlertingServerStart,
      AlertingServerSetupDependencies,
      AlertingServerStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: AlertingV2Config;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<AlertingV2Config>();
  }

  public setup(core: CoreSetup, plugins: AlertingServerSetupDependencies) {
    setupSavedObjects({
      savedObjects: core.savedObjects,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      logger: this.logger,
    });

    initializeEsqlRulesTaskDefinition(
      this.logger,
      plugins.taskManager,
      core.getStartServices() as Promise<[CoreStart, AlertingServerStartDependencies, unknown]>,
      this.config
    );

    const router = core.http.createRouter();
    registerEsqlRuleRoutes({
      router,
      logger: this.logger,
      coreStartServices: core.getStartServices() as Promise<
        [
          CoreStart,
          {
            taskManager: AlertingServerStartDependencies['taskManager'];
            spaces: AlertingServerStartDependencies['spaces'];
            encryptedSavedObjects: AlertingServerStartDependencies['encryptedSavedObjects'];
            security?: AlertingServerStartDependencies['security'];
          },
          unknown
        ]
      >,
    });

    return;
  }

  public start(core: CoreStart, plugins: AlertingServerStartDependencies) {
    return;
  }

  public stop() {
    return;
  }
}
