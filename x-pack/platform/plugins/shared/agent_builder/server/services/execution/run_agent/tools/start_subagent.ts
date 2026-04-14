/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import { z } from '@kbn/zod/v4';
import { ToolType, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentCapabilities, ChatEvent, AssistantResponse } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, SubAgentExecutor } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';

const schema = z.object({
  description: z.string().describe('A short (3-5 word) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
});

export const createSubagentTool = ({
  agentId,
  executionId,
  connectorId,
  capabilities,
  subAgentExecutor,
  abortSignal,
}: {
  agentId: string;
  executionId: string;
  connectorId?: string;
  capabilities?: AgentCapabilities;
  subAgentExecutor: SubAgentExecutor;
  abortSignal?: AbortSignal;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: 'start_subagent',
    description:
      'Start a sub-agent to perform a specific task. The sub-agent runs with the same configuration as the current agent. Use this to delegate complex sub-tasks.',
    type: ToolType.builtin,
    schema,
    tags: ['subagent'],
    handler: async ({ description, prompt }) => {
      try {
        const { events$ } = await subAgentExecutor.executeSubAgent({
          agentId,
          connectorId,
          capabilities,
          parentExecutionId: executionId,
          prompt,
          abortSignal,
        });

        const response = await extractFinalResponse(events$);

        return {
          results: [createOtherResult({ response })],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          results: [createErrorResult(`Sub-agent execution failed: ${message}`)],
        };
      }
    },
  };
};

/**
 * Subscribe to the events observable and extract the final response text
 * from the RoundComplete event.
 */
const extractFinalResponse = async (events$: Observable<ChatEvent>): Promise<AssistantResponse> => {
  const events = await firstValueFrom(events$.pipe(toArray()));
  const roundComplete = events.find(isRoundCompleteEvent);

  if (!roundComplete) {
    throw new Error('Sub-agent execution completed without a round complete event');
  }

  return roundComplete.data.round.response;
};
