/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsPublicPluginStart } from '@kbn/workflows-management-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  workflowsManagement: WorkflowsPublicPluginStart;
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginStart {}
