/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface PluginSetupDependencies {
  workflowsManagement?: WorkflowsServerPluginSetup;
  agentBuilder: AgentBuilderPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  llmTasks?: LlmTasksPluginStart;
  cases?: CasesServerStart;
  spaces?: SpacesPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginStart {}
