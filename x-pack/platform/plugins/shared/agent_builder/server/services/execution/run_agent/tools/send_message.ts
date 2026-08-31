/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter, firstValueFrom } from 'rxjs';
import { z } from '@kbn/zod/v4';
import { ToolType, isRoundCompleteEvent, internalTools } from '@kbn/agent-builder-common';
import { EffortLevels, type EffortLevel } from '@kbn/agent-builder-common/model_provider';
import type { ChatEvent, AssistantResponse } from '@kbn/agent-builder-common';
import type { InternalBuiltinToolDefinition, SubAgentExecutor } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BackgroundExecutionService } from '../background_execution_service';
import type { SubagentTracker } from '../subagent_tracker';

const schema = z.object({
  to: z.string().describe('Name of the persistent sub-agent to talk to.'),
  prompt: z.string().describe('The message to send.'),
  run_in_background: z
    .boolean()
    .optional()
    .describe(
      'Set to true to fire this message off and continue with other work; you will be notified when the sub-agent finishes replying.'
    ),
  effort: z
    .enum([EffortLevels.low, EffortLevels.medium, EffortLevels.high])
    .optional()
    .describe('The effort level of this exchange.'),
});

const toolDescription = `Send a message to an existing persistent sub-agent.

Use this to follow up with a persistent sub-agent you (or another agent) previously created via \`run_subagent({ mode: "persistent", name: "..." })\`.
The sub-agent sees the full history of your prior exchanges with it.

- The recipient must resolve to a persistent sub-agent in the current conversation's
  active roster (see "Active persistent sub-agents" system notices in the message
  history). Sending to an unknown name fails with a clear error.
- To create a fresh sub-agent, use \`run_subagent\`. \`send_message\` never creates.
`;

export const createSendMessageTool = ({
  executionId: parentExecutionId,
  subAgentExecutor,
  abortSignal,
  backgroundExecutionService,
  subagentTracker,
}: {
  agentId: string;
  executionId: string;
  subAgentExecutor: SubAgentExecutor;
  abortSignal?: AbortSignal;
  backgroundExecutionService?: BackgroundExecutionService;
  subagentTracker?: SubagentTracker;
}): InternalBuiltinToolDefinition<typeof schema> => {
  return {
    id: internalTools.sendMessageToAgent,
    description: toolDescription,
    type: ToolType.builtin,
    schema,
    tags: ['subagent'],
    handler: async (
      { to, prompt, run_in_background = false, effort = 'medium' },
      { events, modelProvider }
    ) => {
      if (!subagentTracker) {
        return {
          results: [
            createErrorResult(
              'send_message is not available in this execution context (no active roster).'
            ),
          ],
        };
      }

      const childId = subagentTracker.get(to);
      if (!childId) {
        const roster = Object.keys(subagentTracker.snapshot());
        return {
          results: [
            createErrorResult(
              `No sub-agent named "${to}" exists in this conversation. ` +
                (roster.length > 0
                  ? `Available: ${roster.join(', ')}. `
                  : `No persistent sub-agents have been created yet. `) +
                `Use run_subagent to create one first.`
            ),
          ],
        };
      }

      try {
        const subAgentModel = await modelProvider.selectModel({
          effortLevel: effort as EffortLevel,
        });
        const { executionId, events$ } = await subAgentExecutor.sendToSubAgent({
          parentExecutionId,
          conversationId: childId,
          prompt,
          connectorId: subAgentModel.connector.connectorId,
          ...(run_in_background ? {} : { abortSignal }),
        });

        events.reportProgress(`Sub-agent execution ${executionId} started`, {
          metadata: { agent_execution_id: executionId, internal: 'true' },
        });

        if (run_in_background) {
          backgroundExecutionService?.registerExecution(executionId);
          return {
            results: [
              createOtherResult({
                agent_execution_id: executionId,
                status: 'queued',
              }),
            ],
          };
        }

        const response = await extractFinalResponse(events$);
        return {
          results: [
            createOtherResult({
              agent_execution_id: executionId,
              status: 'completed',
              response,
            }),
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          results: [createErrorResult(`send_message failed: ${message}`)],
        };
      }
    },
  };
};

const extractFinalResponse = async (events$: Observable<ChatEvent>): Promise<AssistantResponse> => {
  const roundComplete = await firstValueFrom(events$.pipe(filter(isRoundCompleteEvent)), {
    defaultValue: undefined,
  });
  if (!roundComplete) {
    throw new Error('Sub-agent execution completed without a round complete event');
  }
  return roundComplete.data.round.response;
};
