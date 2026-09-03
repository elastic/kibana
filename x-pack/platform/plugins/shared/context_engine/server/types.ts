/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';
import type { AiIndexService } from './ai_indices/service';
import type { ImprovementsServiceApi } from './improvements/service';
import type { SignalsServiceApi } from './signals/service';
import type { WorkflowProvider } from './workflows/provider';

export interface ContextEnginePluginSetup {
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
  /**
   * Supplies the workflow operations the apply engine needs.
   *
   * Inverted rather than depending on `workflowsManagement` directly, which is a cycle: that plugin
   * reaches `agent_builder_sml`, which reaches this one. `contextEngineAgentBuilder` already
   * depends on both, so it registers the adapter. Until it does, workflow improvements report that
   * workflows are unavailable instead of failing obscurely.
   */
  registerWorkflowProvider: (provider: WorkflowProvider) => void;
}

export interface ContextEnginePluginStart {
  getAiIndexService: () => AiIndexService;
  /** The signals store. */
  getSignalsService: () => SignalsServiceApi;
  /**
   * The improvements store, bound to the caller's Elasticsearch client. Pass a request-scoped one:
   * the store is a user-owned index, so Elasticsearch authorizes each read and write.
   */
  getImprovementsService: (esClient: ElasticsearchClient) => ImprovementsServiceApi;
}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface ContextEngineStartDependencies {
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}
