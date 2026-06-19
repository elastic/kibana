/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import {
  AI_SUMMARY_PANEL_EMBEDDABLE_TYPE,
  AI_DASHBOARD_SUMMARY_EMBEDDABLE_TYPE,
} from '../common/constants';
import { setServices } from './services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class AiSummaryPanelPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddablePublicDefinition(AI_SUMMARY_PANEL_EMBEDDABLE_TYPE, async () => {
      const { aiSummaryPanelEmbeddableFactory } = await import('./async_services');
      return aiSummaryPanelEmbeddableFactory;
    });
    embeddable.registerEmbeddablePublicDefinition(
      AI_DASHBOARD_SUMMARY_EMBEDDABLE_TYPE,
      async () => {
        const { aiDashboardSummaryEmbeddableFactory } = await import(
          './ai_dashboard_summary_embeddable'
        );
        return aiDashboardSummaryEmbeddableFactory;
      }
    );
  }

  start(core: CoreStart) {
    setServices(core);
  }
}
