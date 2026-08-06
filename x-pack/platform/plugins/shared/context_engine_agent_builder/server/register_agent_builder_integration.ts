/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
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
  let contextEngineStart: ContextEnginePluginStart | undefined;

  void coreSetup.getStartServices().then(([, startDeps]) => {
    contextEngineStart = startDeps.contextEngine;
  });

  registerAttachmentTypes(agentBuilder);

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
    getAiIndexService: () => {
      if (!contextEngineStart) {
        throw new Error('Context Engine plugin has not started');
      }
      return contextEngineStart.getAiIndexService();
    },
  });
};
