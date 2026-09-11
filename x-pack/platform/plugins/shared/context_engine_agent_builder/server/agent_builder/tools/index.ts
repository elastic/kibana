/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { createSaveAutomationTool } from './save_automation/tool';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const registerAgentBuilderTools = ({
  agentBuilder,
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): void => {
  agentBuilder.tools.register(
    createSaveAutomationTool({
      getAiIndexService,
      getCoreStart,
      getSecurityStart,
      getWorkflowsManagement,
    })
  );
};
