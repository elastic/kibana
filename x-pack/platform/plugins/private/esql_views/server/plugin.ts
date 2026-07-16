/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerViewsRoutes } from './routes/views';

export class EsqlViewsServerPlugin implements Plugin<void, void> {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): void {
    const router = core.http.createRouter();
    registerViewsRoutes(router, this.initContext.logger.get());
  }

  public start(): void {}

  public stop(): void {}
}
