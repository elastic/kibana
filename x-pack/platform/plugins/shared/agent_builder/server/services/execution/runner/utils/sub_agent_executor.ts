/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SubAgentExecutor } from '@kbn/agent-builder-server';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';

export const createSubAgentExecutor = ({
  request,
  getExecutionService,
  projectRouting,
}: {
  request: KibanaRequest;
  getExecutionService: () => AgentExecutionService;
  /** CPS routing of the parent run, inherited by every sub-agent it spawns. */
  projectRouting?: string;
}): SubAgentExecutor => {
  return {
    executeSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.standalone,
        interactive: { enabled: false },
        request,
        params: {
          agentId: params.agentId,
          connectorId: params.connectorId,
          capabilities: params.capabilities,
          parentExecutionId: params.parentExecutionId,
          nextInput: { message: params.prompt },
          projectRouting,
        },
        abortSignal: params.abortSignal,
      });
    },

    createSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.conversation,
        interactive: { enabled: false },
        request,
        params: {
          agentId: params.agentId,
          connectorId: params.connectorId,
          capabilities: params.capabilities,
          parentExecutionId: params.parentExecutionId,
          conversationId: params.conversationId,
          autoCreateConversationWithId: true,
          nextInput: { message: params.prompt },
          subagentCreation: {
            parentConversationId: params.parentConversationId,
            subagentName: params.subagentName,
            subagentPurpose: params.subagentPurpose,
          },
        },
        abortSignal: params.abortSignal,
      });
    },

    sendToSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.conversation,
        interactive: { enabled: false },
        request,
        params: {
          connectorId: params.connectorId,
          capabilities: params.capabilities,
          parentExecutionId: params.parentExecutionId,
          conversationId: params.conversationId,
          autoCreateConversationWithId: false,
          nextInput: { message: params.prompt },
        },
        abortSignal: params.abortSignal,
      });
    },

    getExecution: async (executionId) => {
      const executionService = getExecutionService();
      return executionService.getExecution(executionId);
    },
  };
};
