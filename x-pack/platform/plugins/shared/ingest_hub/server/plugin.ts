/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';

import type { IngestHubServerSetupDeps, IngestHubServerStartDeps } from './types';
import { registerRoutes } from './routes';

export class IngestHubPlugin
  implements Plugin<void, void, IngestHubServerSetupDeps, IngestHubServerStartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<IngestHubServerStartDeps, void>): void {
    const router = core.http.createRouter();
    registerRoutes(router, this.logger);
  }

  public start(_core: CoreStart, _plugins: IngestHubServerStartDeps): void {}

  public stop(): void {}
}
