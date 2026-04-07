/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, getAgentFromRunContext } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ConversationService } from '../../conversation/conversation_service';

const spawnConversationSchema = z.object({
  initial_message: z
    .string()
    .describe(
      'The first message or instruction for the new conversation. It will be sent automatically.'
    ),
  include_context: z
    .boolean()
    .optional()
    .describe(
      'If true, the new conversation starts with the full history of the current conversation as context. ' +
        'Default: false (fresh start with only initial_message).'
    ),
  title: z.string().optional().describe('Optional title for the new conversation.'),
  connector_id: z
    .string()
    .optional()
    .describe(
      'Optional connector ID specifying which LLM model the spawned conversation should use. ' +
        'Use this when the user asks for a specific model (e.g. "a cheap model", "a fast model"). ' +
        'Available connector IDs are listed in the available_connectors field of every spawn_conversation result. ' +
        'If omitted, the spawned conversation uses the same connector as this conversation.'
    ),
});

interface SpawnConversationToolOptions {
  getConversationsService: () => ConversationService;
  getInference: () => InferenceServerStart;
}

/**
 * Creates the spawn_conversation tool.
 *
 * Returns the new conversation_id and available_connectors so the LLM can
 * select a specific model on subsequent calls via connector_id.
 */
export const createSpawnConversationTool = ({
  getConversationsService,
  getInference,
}: SpawnConversationToolOptions): BuiltinToolDefinition<typeof spawnConversationSchema> => ({
  id: platformCoreTools.spawnConversation,
  type: ToolType.builtin,
  description:
    'Spawns a new parallel conversation that runs independently in the background. ' +
    'Use when the user asks to open a new chat, start a parallel investigation, ' +
    'delegate a sub-task, or investigate multiple topics simultaneously. ' +
    'The spawned conversation opens as a background tab/pane. ' +
    'Returns the new conversation_id (for ask_conversation). ' +
    'Set include_context:true to give the new conversation the full history of this one. ' +
    'Set connector_id to use a specific model — available connector IDs are already listed ' +
    'in your system prompt under "AVAILABLE LLM CONNECTORS". ' +
    'Never call this tool without connector_id just to discover connectors.',
  schema: spawnConversationSchema,
  tags: ['conversation', 'spawn'],
  handler: async (
    { initial_message: initialMessage, include_context: includeContext, title, connector_id: connectorId },
    context
  ) => {
    const { request } = context;

    try {
      const client = await getConversationsService().getScopedClient({ request });
      const inference = getInference();

      const agentFromContext = getAgentFromRunContext(context.runContext);
      let newConversationId: string;

      if (includeContext && agentFromContext?.conversationId) {
        // Fork: copy the current conversation's rounds into the new one
        const parent = await client.get(agentFromContext.conversationId);
        const forked = await client.create({
          agent_id: parent.agent_id,
          title: title ?? `Spawned from ${parent.title}`,
          rounds: parent.rounds,
          attachments: parent.attachments,
        });
        newConversationId = forked.id;
      } else {
        // Fresh: create an empty conversation; the frontend auto-sends initial_message
        const agentId = agentFromContext?.agentId ?? 'elastic-ai-agent';
        const fresh = await client.create({
          agent_id: agentId,
          title: title ?? 'New Conversation',
          rounds: [],
        });
        newConversationId = fresh.id;
      }

      // Fetch available connectors so the LLM can pick a model on subsequent calls.
      let availableConnectors: Array<{ id: string; name: string; type: string }> = [];
      try {
        const connectors = await inference.getConnectorList(request);
        availableConnectors = connectors.map((c) => ({
          id: c.connectorId,
          name: c.name,
          type: c.type,
        }));
      } catch {
        // Non-fatal: connector list is informational only
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              conversation_id: newConversationId,
              title: title ?? 'New Conversation',
              initial_message: initialMessage,
              include_context: includeContext ?? false,
              connector_id: connectorId ?? null,
              available_connectors: availableConnectors,
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
            data: { error: String(err), conversation_id: null },
          },
        ],
      };
    }
  },
});
