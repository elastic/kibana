/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SubAgentExecutor } from '@kbn/agent-builder-server';
import { AgentExecutionMode, createNonInteractiveConfig } from '@kbn/agent-builder-common';
import type { AutoApprovedApi, InteractivityConfig } from '@kbn/agent-builder-common';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import { unionBy } from 'lodash';

export const createSubAgentExecutor = ({
  request,
  getExecutionService,
  projectRouting,
  interactivity,
  workflowExecutionId,
}: {
  request: KibanaRequest;
  getExecutionService: () => AgentExecutionService;
  /** CPS routing of the parent run, inherited by every sub-agent it spawns. */
  projectRouting?: string;
  interactivity: InteractivityConfig;
  /**
   * The workflow run that started the parent run. Every sub-agent inherits it, so a persistent
   * sub-agent's rounds join to that run. Sub-agents don't send it to EIS: only the main agent's
   * LLM calls carry it as their `interactionId` (see `buildExecutionTelemetryMetadata`).
   */
  workflowExecutionId?: string;
}): SubAgentExecutor => {
  const inheritedApis = interactivity.auto_approved_apis;
  const subAgentInteractivity = createNonInteractiveConfig(inheritedApis);

  const interactivityWith = (autoApprovedApis?: AutoApprovedApi[]): InteractivityConfig =>
    autoApprovedApis?.length
      ? createNonInteractiveConfig(
          unionBy(inheritedApis ?? [], autoApprovedApis, ({ target, api }) => `${target}:${api}`)
        )
      : subAgentInteractivity;

  return {
    executeSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.standalone,
        interactive: interactivityWith(params.autoApprovedApis),
        request,
        params: {
          agentId: params.agentId,
          connectorId: params.connectorId,
          parentExecutionId: params.parentExecutionId,
          nextInput: { message: params.prompt },
          projectRouting,
          // Standalone runs report no round events; it's passed on to the sub-agents they spawn.
          ...(workflowExecutionId ? { workflowExecutionId } : {}),
        },
        abortSignal: params.abortSignal,
      });
    },

    createSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.conversation,
        interactive: interactivityWith(params.autoApprovedApis),
        request,
        params: {
          agentId: params.agentId,
          connectorId: params.connectorId,
          parentExecutionId: params.parentExecutionId,
          conversationId: params.conversationId,
          autoCreateConversationWithId: true,
          nextInput: { message: params.prompt },
          subagentCreation: {
            parentConversationId: params.parentConversationId,
            subagentName: params.subagentName,
            subagentPurpose: params.subagentPurpose,
          },
          ...(workflowExecutionId ? { workflowExecutionId } : {}),
        },
        abortSignal: params.abortSignal,
      });
    },

    sendToSubAgent: async (params) => {
      const executionService = getExecutionService();
      return executionService.executeAgent({
        mode: AgentExecutionMode.conversation,
        interactive: subAgentInteractivity,
        request,
        params: {
          agentId: params.agentId,
          connectorId: params.connectorId,
          parentExecutionId: params.parentExecutionId,
          conversationId: params.conversationId,
          autoCreateConversationWithId: false,
          nextInput: { message: params.prompt },
          ...(workflowExecutionId ? { workflowExecutionId } : {}),
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
