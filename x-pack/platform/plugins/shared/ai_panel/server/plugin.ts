/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  AI_PANEL_EMBEDDABLE_TYPE,
  AI_PANEL_APP_NAME,
  AI_PANEL_ENABLED_FLAG_KEY,
} from '../common/constants';
import { aiPanelEmbeddableSchema } from './embeddable/schemas';
import { registerGenerateRoute } from './routes/generate_route';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

interface StartDeps {
  inference: InferenceServerStart;
}

export class AiPanelPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private coreStart: CoreStart | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup<StartDeps>, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddableServerDefinition(AI_PANEL_EMBEDDABLE_TYPE, {
      title: AI_PANEL_APP_NAME,
      // Temporary kill-switch — remove once the feature is approved to ship.
      getSchema: () =>
        this.coreStart?.featureFlags.getBooleanValue(AI_PANEL_ENABLED_FLAG_KEY, false)
          ? aiPanelEmbeddableSchema
          : undefined,
    });

    const router = core.http.createRouter();
    registerGenerateRoute(router, core.getStartServices, this.initializerContext.logger.get());
  }

  start(core: CoreStart, _plugins: StartDeps) {
    this.coreStart = core;
  }
}
