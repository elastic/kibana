/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { ConversationService } from '../../conversation/conversation_service';
import type { AgentExecutionService } from '../../execution/types';

const askConversationSchema = z.object({
  conversation_id: z
    .string()
    .describe(
      'The ID of the conversation to query. Use the conversation IDs listed in your context ' +
        'under "Other active conversations you can query".'
    ),
  question: z
    .string()
    .describe(
      'The question to send to the other conversation. It will be delivered as a new user ' +
        'message and the other agent will reason and respond in full. Make the question ' +
        'self-contained — do not assume the other agent has access to this conversation.'
    ),
});

interface AskConversationToolOptions {
  getConversationsService: () => ConversationService;
  getExecutionService: () => AgentExecutionService;
}

/**
 * Creates the ask_conversation tool.
 *
 * Sends a new user message to the target conversation and awaits the agent's full response.
 * The question is appended to the target conversation's history (visible in the UI).
 * The tool blocks until the other agent finishes its round, then returns the response.
 */
export const createAskConversationTool = ({
  getConversationsService,
  getExecutionService,
}: AskConversationToolOptions): BuiltinToolDefinition<typeof askConversationSchema> => ({
  id: platformCoreTools.askConversation,
  type: ToolType.builtin,
  description:
    'Send a question to another active conversation and wait for its response. ' +
    'The question is delivered as a new message to that conversation, and the other agent ' +
    'will reason with its full history before answering. ' +
    'Only use conversation IDs listed in your context under "Other active conversations you can query".',
  schema: askConversationSchema,
  tags: ['conversation', 'inter-agent'],
  handler: async ({ conversation_id: conversationId, question }, context) => {
    const { request } = context;

    try {
      // Fetch the conversation title for a richer result (agent_id resolved by execution service).
      const client = await getConversationsService().getScopedClient({ request });
      const conversation = await client.get(conversationId);

      const executionService = getExecutionService();

      // Deliver the question as a new user message. The prefix makes it clear to the asked
      // agent that it is responding to a peer, so it can tailor its response appropriately.
      const messageToSend = `[Question from another agent]: ${question}`;

      const { executionId, events$ } = await executionService.executeAgent({
        request,
        params: {
          conversationId,
          nextInput: { message: messageToSend },
        },
        // Never schedule on Task Manager — we need to await the result inline.
        useTaskManager: false,
      });

      // Wait for round_complete — this fires after the round has been persisted to the database.
      // Using message_complete instead would return before persistence, so the frontend's
      // invalidateConversation() call on tool_result would fetch stale data.
      const roundCompleteEvent = await lastValueFrom(events$.pipe(filter(isRoundCompleteEvent)), {
        defaultValue: null,
      });

      const answer =
        roundCompleteEvent?.data.round?.response?.message ??
        'The conversation produced no response. It may still be processing or encountered an error.';

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              conversation_id: conversationId,
              conversation_title: conversation.title,
              answer,
            },
          },
        ],
      };
    } catch (err) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              conversation_id: conversationId,
              answer: `Error querying conversation: ${err instanceof Error ? err.message : String(err)}`,
            },
          },
        ],
      };
    }
  },
});
