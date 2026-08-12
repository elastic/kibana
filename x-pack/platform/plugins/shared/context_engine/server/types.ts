/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';
import type { SignalsServiceApi } from './signals/service';

/**
 * Structural subset of the Workflows Management plugin's `management` API, declared locally rather
 * than importing `@kbn/workflows-management-plugin` — that project ref would re-introduce the
 * `context_engine → workflows_management → agent_builder_sml → context_engine` cycle. Used by the
 * `ai_index` attachment's read tool (via the Agent Builder bridge) to read linked workflow YAML.
 */
export interface WorkflowsManagementApiLike {
  getWorkflow(id: string, spaceId: string): Promise<{ yaml?: string; name?: string } | null>;
}

export interface ContextEnginePluginSetup {
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
  /**
   * Exposes the local workflows API (`= workflowsManagement?.management`, `undefined` when Workflows
   * Management isn't installed). The Agent Builder bridge (`agent_builder_platform`) pulls this for
   * the `ai_index` attachment's read tool — the server-side inversion point so `context_engine`
   * never depends on `agentBuilder`.
   */
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
}

export interface ContextEnginePluginStart {
  /** The signals store. */
  getSignalsService: () => SignalsServiceApi;
}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface ContextEngineStartDependencies {
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  workflowsManagement?: { management: WorkflowsManagementApiLike };
}
