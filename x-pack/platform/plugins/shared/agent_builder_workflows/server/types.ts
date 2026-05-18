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
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentContextLayer: AgentContextLayerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  agentContextLayer: AgentContextLayerPluginStart;
  /**
   * Optional — when present, `workflow_execute_step` pre-validates each step's
   * `with:` block against the registered step's Zod schema before invoking the
   * execution engine. Falls through silently if unavailable (e.g. for unit
   * tests that don't wire the registry).
   */
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginStart {}
