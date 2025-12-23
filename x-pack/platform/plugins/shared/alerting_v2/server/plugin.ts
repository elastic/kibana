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

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    void this.logger;
  }

  public setup(core: CoreSetup, plugins: AlertingServerSetupDependencies) {
    return;
  }

  public start(core: CoreStart, plugins: AlertingServerStartDependencies) {
    return;
  }

  public stop() {
    return;
  }
}
