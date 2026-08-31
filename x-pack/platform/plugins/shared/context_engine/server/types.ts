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
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';
import type { AiIndexService } from './ai_indices/service';
import type { SignalsServiceApi } from './signals/service';

export interface ContextEnginePluginSetup {
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
}

export interface ContextEnginePluginStart {
  getAiIndexService: () => AiIndexService;
  /** The signals store. */
  getSignalsService: () => SignalsServiceApi;
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
}
