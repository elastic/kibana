/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';
import type { AiIndexService } from './ai_indices/service';

/**
 * Minimal structural view of the Workflows Management API that Context Engine
 * consumes (the `save_automation` agent-builder tool). Declared locally rather
 * than importing `WorkflowsManagementApi` from `@kbn/workflows-management-plugin/server`
 * to avoid a TypeScript project-reference cycle:
 *   context_engine -> workflows_management -> agent_builder_sml -> context_engine.
 * The real API is a superset and stays structurally assignable to this.
 */
export interface WorkflowsManagementApiLike {
  createWorkflow(
    command: { yaml: string; id?: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ id: string }>;
  updateWorkflow(
    id: string,
    command: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<unknown>;
  getWorkflow(id: string, spaceId: string): Promise<{ yaml?: string; name?: string } | null>;
}

export interface ContextEnginePluginSetup {
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
  /**
   * Exposed so a downstream integrator (agent_builder_platform) can register the
   * Context Engine's agent-builder surface. Context Engine loads before Agent
   * Builder, so it cannot register directly without a dependency cycle.
   */
  getAiIndexService: () => AiIndexService;
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginStart {}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  workflowsManagement?: { management: WorkflowsManagementApiLike };
}

export interface ContextEngineStartDependencies {
  taskManager?: TaskManagerStartContract;
}
