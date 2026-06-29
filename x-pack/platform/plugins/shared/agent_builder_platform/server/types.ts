/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
} from '@kbn/agent-context-layer-plugin/server';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentContextLayer: AgentContextLayerPluginSetup;
  actions: ActionsPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  agentContextLayer: AgentContextLayerPluginStart;
  llmTasks?: LlmTasksPluginStart;
  cases?: CasesServerStart;
  spaces?: SpacesPluginStart;
}

export interface AgentBuilderPlatformTracingFeaturesStart {
  /**
   * Syncs tracing platform features (overview dashboard and traces skill).
   * When `spaceId` is provided, only the dashboard for that space is synced.
   * The traces skill is registered globally when `enabled` is true.
   */
  sync: (options: { enabled: boolean; spaceId?: string }) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginSetup {}

export interface AgentBuilderPlatformPluginStart {
  tracingFeatures: AgentBuilderPlatformTracingFeaturesStart;
}
