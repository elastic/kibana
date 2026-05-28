/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { AI_SUMMARY_PANEL_EMBEDDABLE_TYPE, AI_SUMMARY_PANEL_APP_NAME } from '../common/constants';
import { aiSummaryPanelEmbeddableSchema } from './embeddable/schemas';
import { registerGenerateRoute } from './routes/generate_route';
import { registerDefaultConnectorRoute } from './routes/default_connector_route';
import { registerPreviewEsqlRoute } from './routes/preview_esql_route';
import { registerEsqlDataRoute } from './routes/esql_data_route';
import { CACHE_SO_TYPE, CACHE_INDEX, cleanupExpired } from './cache/html_cache';

const CLEANUP_TASK_TYPE = 'ai_panel:cache_cleanup';
const CLEANUP_TASK_ID = 'ai_panel:cache_cleanup';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  taskManager: TaskManagerSetupContract;
}

interface StartDeps {
  inference: InferenceServerStart;
  taskManager: TaskManagerStartContract;
}

export class AiSummaryPanelPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private coreStart?: CoreStart;

  setup(core: CoreSetup<StartDeps>, { embeddable, taskManager }: SetupDeps) {
    embeddable.registerEmbeddableServerDefinition(AI_SUMMARY_PANEL_EMBEDDABLE_TYPE, {
      title: AI_SUMMARY_PANEL_APP_NAME,
      getSchema: () => aiSummaryPanelEmbeddableSchema,
    });

    core.savedObjects.registerType({
      name: CACHE_SO_TYPE,
      hidden: true,
      namespaceType: 'agnostic',
      indexPattern: CACHE_INDEX,
      mappings: {
        properties: {
          html: { type: 'text', index: false },
          expiresAt: { type: 'date' },
        },
      },
    });

    taskManager.registerTaskDefinitions({
      [CLEANUP_TASK_TYPE]: {
        title: 'AI Panel HTML Cache Cleanup',
        createTaskRunner: () => ({
          run: async () => {
            if (!this.coreStart) return;
            const repo = this.coreStart.savedObjects.createInternalRepository([CACHE_SO_TYPE]);
            await cleanupExpired(repo);
          },
        }),
      },
    });

    const router = core.http.createRouter();
    registerGenerateRoute(router, core.getStartServices);
    registerDefaultConnectorRoute(router, core.getStartServices);
    registerPreviewEsqlRoute(router);
    registerEsqlDataRoute(router);
  }

  start(core: CoreStart, { taskManager }: StartDeps) {
    this.coreStart = core;
    taskManager
      .ensureScheduled({
        id: CLEANUP_TASK_ID,
        taskType: CLEANUP_TASK_TYPE,
        schedule: { interval: '6h' },
        params: {},
        state: {},
      })
      .catch(() => {});
  }
}
