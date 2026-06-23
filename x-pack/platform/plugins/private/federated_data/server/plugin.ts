/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerDataSetsRoutes } from './routes/register_routes';
import type { FederatedDataConfigType } from './config';

export class FederatedDataServerPlugin implements Plugin<void, void> {
  private readonly config: FederatedDataConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<FederatedDataConfigType>();
  }

  public setup({ http }: CoreSetup) {
    registerDataSetsRoutes(http.createRouter(), this.config);
  }

  public start(_core: CoreStart) {}

  public stop() {}
}
