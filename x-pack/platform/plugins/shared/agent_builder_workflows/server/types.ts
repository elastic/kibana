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
   * Optional — workflow-side helpers query this start contract to enrich their
   * behavior:
   *  - `workflow_execute_step` pre-validates each step's `with:` block against
   *    the registered Zod schema before invoking the execution engine.
   *  - `get_step_definitions` merges the workflows-extensions registry into the
   *    discovery surface (data.*, ai.*, security.*, …) so the model can find
   *    plugin-registered steps and retrieve their JSON Schema in one round-trip.
   *
   * Falls through silently if unavailable (e.g. for unit tests or environments
   * that don't load the workflows-extensions plugin).
   */
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

export interface AgentBuilderWorkflowsPluginSetup {
  /**
   * Register a `kibana.request` (method, path) pair as read-only and safe to
   * execute inside `workflow_execute_step` without a HITL confirmation dialog
   * (Primitive A). Solution plugins call this from their own `setup()` to
   * whitelist the internal routes they expose to the agent.
   *
   * @param method - HTTP method (case-insensitive, e.g. "POST", "GET")
   * @param path - Kibana-internal route path (e.g. "/internal/security_solution/alert_analysis/related_alerts")
   */
  registerSafeKibanaRequestPath: (method: string, path: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginStart {}
