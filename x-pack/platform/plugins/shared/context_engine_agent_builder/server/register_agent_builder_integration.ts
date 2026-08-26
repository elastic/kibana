/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { apiPrivileges } from '@kbn/context-engine-plugin/common/features';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { registerAgentBuilderTools } from './agent_builder/tools';
import { registerAttachmentTypes } from './attachment_types';
import type {
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderStartDependencies,
} from './types';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const registerContextEngineAgentBuilderIntegration = ({
  coreSetup,
  agentBuilder,
  workflowsManagement,
}: {
  coreSetup: CoreSetup<
    ContextEngineAgentBuilderStartDependencies,
    ContextEngineAgentBuilderPluginStart
  >;
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsManagementApi;
}): void => {
  registerAttachmentTypes(agentBuilder);

  agentBuilder.agents.registerAiIndexResolver(async ({ ids, request }) => {
    const [, startDeps] = await coreSetup.getStartServices();
    const { contextEngine, security } = startDeps;

    // The registry read below goes through the internal user, so mirror the enforcement
    // Context Engine's own API layer applies to reads: the caller must hold the Context
    // Engine read privilege. The check is space-aware (Kibana feature privileges are
    // granted per space); denied callers get no details. Check errors propagate: the
    // caller degrades to rendering without index details (fail closed).
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const { hasAllRequested } = await checkPrivileges({
      kibana: [security.authz.actions.api.get(apiPrivileges.readContextEngine)],
    });
    if (!hasAllRequested) {
      return [];
    }

    const aiIndexService = contextEngine.getAiIndexService();
    const requestedIds = new Set(ids);
    const aiIndices = await aiIndexService.list();
    return aiIndices
      .filter((aiIndex) => requestedIds.has(aiIndex.id))
      .map((aiIndex) => ({
        id: aiIndex.id,
        name: aiIndex.dest.value,
        description: aiIndex.description,
      }));
  });

  registerAgentBuilderTools({
    agentBuilder,
    getCoreStart: async () => {
      const [coreStart] = await coreSetup.getStartServices();
      return coreStart;
    },
    getSecurityStart: async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.security;
    },
    getWorkflowsManagement: () => workflowsManagement,
    getAiIndexService: async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.contextEngine.getAiIndexService();
    },
  });
};
