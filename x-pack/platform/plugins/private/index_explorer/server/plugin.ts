/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { IndexExplorerConfig } from './config';
import { registerRoutes } from './routes';

export class IndexExplorerPlugin implements Plugin {
  private readonly config: IndexExplorerConfig;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<IndexExplorerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup({ http }: CoreSetup): void {
    registerRoutes({ router: http.createRouter(), config: this.config, logger: this.logger });
  }

  public start(): void {}

  public stop(): void {}
}
