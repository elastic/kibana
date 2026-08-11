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
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentBuilderSml: AgentBuilderSmlPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  agentBuilderSml: AgentBuilderSmlPluginStart;
  security?: SecurityPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginStart {}
