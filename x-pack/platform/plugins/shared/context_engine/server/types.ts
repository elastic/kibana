/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
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
import type { FeedbackScheduleService } from './feedback/schedule';
import type { ImprovementsServiceApi } from './improvements/service';
import type { SignalsServiceApi } from './signals/service';
import type { WorkflowProvider } from './workflows/provider';

export interface ContextEnginePluginSetup {
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
  /**
   * Supplies the workflow operations needed to apply an approved automation improvement. Registered
   * by `contextEngineAgentBuilder`, because this plugin cannot depend on workflows directly.
   */
  registerWorkflowProvider: (provider: WorkflowProvider) => void;
}

export interface ContextEnginePluginStart {
  getAiIndexService: () => AiIndexService;
  /** The signals store. */
  getSignalsService: () => SignalsServiceApi;
  /** The improvements store. */
  getImprovementsService: () => ImprovementsServiceApi;
  /** Controls the scheduled improvement loop for an AI index. */
  getFeedbackScheduleService: () => FeedbackScheduleService;
}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  /** Optional: without it the improvement loop cannot be scheduled or run. */
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}

export interface ContextEngineStartDependencies {
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}
