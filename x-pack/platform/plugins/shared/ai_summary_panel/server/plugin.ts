/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  AI_SUMMARY_PANEL_EMBEDDABLE_TYPE,
  AI_SUMMARY_PANEL_APP_NAME,
  AI_DASHBOARD_SUMMARY_EMBEDDABLE_TYPE,
  AI_DASHBOARD_SUMMARY_APP_NAME,
} from '../common/constants';
import {
  aiSummaryPanelEmbeddableSchema,
  aiDashboardSummaryEmbeddableSchema,
} from './embeddable/schemas';
import { registerGenerateRoute } from './routes/generate_route';
import { registerDefaultConnectorRoute } from './routes/default_connector_route';
import { registerPreviewEsqlRoute } from './routes/preview_esql_route';
import { registerEsqlDataRoute } from './routes/esql_data_route';
import { registerGenerateSummaryRoute } from './routes/generate_summary_route';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

interface StartDeps {
  inference: InferenceServerStart;
}

export class AiSummaryPanelPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup<StartDeps>, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddableServerDefinition(AI_SUMMARY_PANEL_EMBEDDABLE_TYPE, {
      title: AI_SUMMARY_PANEL_APP_NAME,
      getSchema: () => aiSummaryPanelEmbeddableSchema,
    });
    embeddable.registerEmbeddableServerDefinition(AI_DASHBOARD_SUMMARY_EMBEDDABLE_TYPE, {
      title: AI_DASHBOARD_SUMMARY_APP_NAME,
      getSchema: () => aiDashboardSummaryEmbeddableSchema,
    });

    const router = core.http.createRouter();
    registerGenerateRoute(router, core.getStartServices);
    registerGenerateSummaryRoute(router, core.getStartServices);
    registerDefaultConnectorRoute(router, core.getStartServices);
    registerPreviewEsqlRoute(router);
    registerEsqlDataRoute(router);
  }

  start(_core: CoreStart, _plugins: StartDeps) {}
}
