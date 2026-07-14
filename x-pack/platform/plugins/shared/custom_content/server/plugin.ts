/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { registerGenerateRoute } from './routes/generate_route';

interface StartDeps {
  inference: InferenceServerStart;
}

export class CustomContentPlugin implements Plugin<void, void, {}, StartDeps> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup<StartDeps>) {
    const router = core.http.createRouter();
    registerGenerateRoute(router, core.getStartServices, this.initializerContext.logger.get());
  }

  start() {}
}
