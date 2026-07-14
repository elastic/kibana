/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { AI_PANEL_EMBEDDABLE_TYPE, AI_PANEL_ENABLED_FLAG_KEY } from '../common/constants';
import { setServices } from './services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class AiPanelPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddablePublicDefinition(AI_PANEL_EMBEDDABLE_TYPE, async () => {
      const { aiPanelEmbeddableFactory } = await import('./async_services');
      return aiPanelEmbeddableFactory;
    });
  }

  start(core: CoreStart) {
    if (!core.featureFlags.getBooleanValue(AI_PANEL_ENABLED_FLAG_KEY, false)) return;
    setServices(core);
  }
}
