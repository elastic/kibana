/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ContextEngineTasksStart } from '@kbn/context-engine-plugin/server/tasks';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { WorkflowsManagementTasksSetup } from '@kbn/workflows-management-plugin/server/tasks';
import { registerContextEngineAgentBuilderIntegration } from '../register_agent_builder_integration';
import { registerContextEngineInferenceFeatures } from '../register_inference_features';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
  workflowsManagement: WorkflowsManagementTasksSetup;
}

interface TasksStartDeps {
  contextEngine: ContextEngineTasksStart;
  security: SecurityTasksStart;
}

/**
 * The Context Engine side of agent builder for a task pod: the AI index attachment type, the
 * Context Engine agent, the AI index resolver and the tools, registered by the same function the
 * plugin's `server` entry uses. In Kibana, `agentBuilder` hands out a contract whose registrations do
 * nothing, because the `server` entry registered them already.
 */
class ContextEngineAgentBuilderTasksPlugin
  implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps>
{
  setup(core: CoreTasksSetup<TasksStartDeps>, deps: TasksSetupDeps) {
    registerContextEngineAgentBuilderIntegration({
      // The privilege checks use only `authz.actions` and `checkPrivilegesWithRequest`, which the
      // security tasks contract has.
      getStartServices: async () => {
        const [coreStart, { contextEngine, security }, start] = await core.getStartServices();
        return [
          coreStart,
          { contextEngine, security: security as unknown as SecurityPluginStart },
          start,
        ];
      },
      agentBuilder: deps.agentBuilder,
      getWorkflowsManagement: () => deps.workflowsManagement.management,
    });

    if (deps.searchInferenceEndpoints) {
      registerContextEngineInferenceFeatures(deps.searchInferenceEndpoints);
    }
  }

  start() {}
}

export const plugin = async () => new ContextEngineAgentBuilderTasksPlugin();
