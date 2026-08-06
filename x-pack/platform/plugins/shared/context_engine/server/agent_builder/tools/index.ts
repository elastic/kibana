/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { AiIndexService } from '../../ai_indices/service';
import type { ContextEngineWorkflowsManagementSetup } from '../../types';
import { createSaveAutomationTool } from './save_automation/tool';

export const registerAgentBuilderTools = ({
  agentBuilder,
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getAiIndexService: () => AiIndexService;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => ContextEngineWorkflowsManagementSetup['management'] | undefined;
}): void => {
  const register = agentBuilder.tools.register as (tool: unknown) => void;

  register(
    createSaveAutomationTool({
      getAiIndexService,
      getCoreStart,
      getSecurityStart,
      getWorkflowsManagement,
    })
  );
};
