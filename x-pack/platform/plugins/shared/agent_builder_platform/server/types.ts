/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentBuilderSmlPluginSetup,
  AgentBuilderSmlPluginStart,
} from '@kbn/agent-builder-sml-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { CloudStart, CloudSetup } from '@kbn/cloud-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentBuilderSml: AgentBuilderSmlPluginSetup;
  actions: ActionsPluginSetup;
  cloud?: CloudSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  agentBuilderSml: AgentBuilderSmlPluginStart;
  actions: ActionsPluginStart;
  cloud?: CloudStart;
  llmTasks?: LlmTasksPluginStart;
  spaces?: SpacesPluginStart;
}

export interface AgentBuilderPlatformTracingFeaturesStart {
  /**
   * Installs or removes the tracing dashboard for a given space.
   */
  setDashboard: (options: { enabled: boolean; spaceId: string }) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginSetup {}

export interface AgentBuilderPlatformPluginStart {
  tracingFeatures: AgentBuilderPlatformTracingFeaturesStart;
}
