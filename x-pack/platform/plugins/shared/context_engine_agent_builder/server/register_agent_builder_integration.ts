/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { hasContextEngineReadPrivilege } from './agent_builder/has_context_engine_read_privilege';
import { registerAgentBuilderTools } from './agent_builder/tools';
import { registerAttachmentTypes } from './attachment_types';
import { registerContextEngineAgent } from './agent/context_engine_agent';
import type { ToolsContextEngineStart, ToolsCoreStart, ToolsSecurityStart } from './start_types';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

/**
 * Registers the Context Engine attachment, agent, AI index resolver and tools. The one runtime behind
 * Kibana's `server` entry and the task pod's `server/tasks` entry, which pass the same dependencies
 * typed against what both provide.
 */
export const registerContextEngineAgentBuilderIntegration = ({
  getStartServices,
  agentBuilder,
  getWorkflowsManagement,
}: {
  getStartServices: () => Promise<
    [
      ToolsCoreStart,
      { contextEngine: ToolsContextEngineStart; security: ToolsSecurityStart },
      unknown
    ]
  >;
  agentBuilder: AgentBuilderPluginSetup;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): void => {
  registerAttachmentTypes(agentBuilder);
  registerContextEngineAgent(agentBuilder);

  agentBuilder.agents.registerAiIndexResolver(async ({ ids, request }) => {
    const [coreStart, startDeps] = await getStartServices();
    const { contextEngine, security } = startDeps;

    if (!(await hasContextEngineReadPrivilege({ security, request }))) {
      return [];
    }

    // Same rule as the list route; only requested ids are probed.
    const aiIndices = await contextEngine
      .getAiIndexDataReadService({
        esClient: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
        request,
      })
      .list(ids);
    return aiIndices.map((aiIndex) => ({
      id: aiIndex.id,
      esqlTarget: aiIndex.dest.value,
      description: aiIndex.description,
      memoryEnabled: aiIndex.memory_enabled,
    }));
  });

  registerAgentBuilderTools({
    agentBuilder,
    getCoreStart: async () => {
      const [coreStart] = await getStartServices();
      return coreStart;
    },
    getSecurityStart: async () => {
      const [, startDeps] = await getStartServices();
      return startDeps.security;
    },
    getWorkflowsManagement,
    getContextEngineStart: async () => {
      const [, startDeps] = await getStartServices();
      return startDeps.contextEngine;
    },
  });
};
