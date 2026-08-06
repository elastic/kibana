/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { AiIndexProperties } from '../common/http_api/ai_indices';

export interface ContextEngineWorkflowsManagementApi {
  createWorkflow: (
    workflow: { yaml: string; id?: string },
    spaceId: string,
    request: KibanaRequest
  ) => Promise<{ id: string }>;
  updateWorkflow: (
    id: string,
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ) => Promise<unknown>;
}

export interface ContextEngineWorkflowsManagementSetup {
  management: ContextEngineWorkflowsManagementApi;
}

export interface ContextEnginePluginSetup {
  registerAiIndex: (id: string, properties: AiIndexProperties) => void;
  registerAgentBuilderAttachments: (agentBuilder: AgentBuilderPluginSetup) => void;
  registerAgentBuilderTools: (
    agentBuilder: AgentBuilderPluginSetup,
    getCoreStart: () => Promise<CoreStart>
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginStart {}

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsManagement?: ContextEngineWorkflowsManagementSetup;
}

export interface ContextEngineStartDependencies {
  actions: ActionsPluginStart;
  security?: SecurityPluginStart;
}
