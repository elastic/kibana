/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { WorkflowsManagementTasksSetup } from '@kbn/workflows-management-plugin/server/tasks';
import { registerAgentBuilderWorkflows } from '../register_agent_builder';
import { WorkflowsAiTelemetryClient } from '../telemetry/workflows_ai_telemetry_client';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsManagementTasksSetup;
}

interface TasksStartDeps {
  security?: SecurityTasksStart;
}

/**
 * The agent builder side of the workflows plugin for a task pod: the workflow tools, attachment
 * types and the authoring skill, registered by the same function the `server` entry uses. They call
 * the workflows management API that its tasks entry provides. The workflow search
 * memory type belongs to the agent builder SML plugin, which has no tasks entry.
 */
class AgentBuilderWorkflowsTasksPlugin
  implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps>
{
  // Privilege checks only use `authz.actions` and `checkPrivilegesWithRequest`, which the tasks
  // contract has.
  private security?: SecurityPluginStart;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(core: CoreTasksSetup, { agentBuilder, workflowsManagement }: TasksSetupDeps) {
    // The event type is registered by the `server` entry already in Kibana.
    const analytics = {
      reportEvent: core.analytics.reportEvent,
      registerEventType: ((eventTypeOps) => {
        try {
          core.analytics.registerEventType(eventTypeOps);
        } catch {
          // Already registered
        }
      }) as typeof core.analytics.registerEventType,
    };

    registerAgentBuilderWorkflows({
      agentBuilder,
      workflowsManagement,
      getSecurity: () => this.security,
      aiTelemetryClient: new WorkflowsAiTelemetryClient(analytics, this.context.logger.get()),
    });
  }

  start(_core: unknown, { security }: TasksStartDeps = {}) {
    this.security = security as unknown as SecurityPluginStart | undefined;
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new AgentBuilderWorkflowsTasksPlugin(context);
