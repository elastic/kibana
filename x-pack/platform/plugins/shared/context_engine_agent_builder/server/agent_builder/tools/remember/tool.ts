/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import {
  MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS,
  SHORT_TERM_MEMORY_TYPES,
} from '@kbn/context-engine-plugin/common/memory';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TAG_LENGTH,
  MAX_KI_TAGS,
  MAX_KI_TITLE_LENGTH,
} from '@kbn/context-engine-plugin/common/step_types/ki';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import { isoDateTime, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { createConversationReferences, createMemoryWriter } from '../memory_document';

const rememberSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .optional()
    .describe('The id of an existing memory to revise. Omit when creating a new memory.'),
  sessionId: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .optional()
    .describe(
      'For MCP calls only: omit unless continuing a memory session using the sessionId returned by an earlier remember call. Do not invent a value. Agent Builder calls ignore this input and use the current conversation ID.'
    ),
  type: z
    .enum(SHORT_TERM_MEMORY_TYPES)
    .describe(
      'Use memory.session_fact for a granular fact discovered during a session, or memory.session for a session synthesis. When revising a memory, use its existing type.'
    ),
  title: z.string().min(1).max(MAX_KI_TITLE_LENGTH).describe('A short label for the memory'),
  description: z
    .string()
    .min(1)
    .max(MAX_KI_DESCRIPTION_LENGTH)
    .describe('A concise description of the memory and its immediate consequence'),
  content: z
    .string()
    .min(1)
    .max(MAX_KI_CONTENT_LENGTH)
    .describe('Enough context to use the memory without re-deriving it'),
  tags: z
    .array(z.string().min(1).max(MAX_KI_TAG_LENGTH))
    .max(MAX_KI_TAGS)
    .optional()
    .describe(
      'Optional lowercase index names, feature areas, or tools associated with the memory. When revising, omit to preserve existing tags or pass an empty array to clear them.'
    ),
  expires_at: isoDateTime({ offset: true })
    .optional()
    .describe(
      `ISO 8601 timestamp after which the memory must not be recalled. UTC (Z) and numeric timezone offsets are accepted. If omitted, this call sets the expiry to ${MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS} days from now, including when revising an existing memory. It cannot be later than that.`
    ),
});

export const createRememberTool = ({
  getContextEngineStart,
  getCoreStart,
}: {
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
  getCoreStart: () => Promise<CoreStart>;
}): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: contextEngineMemoryTools.remember,
  type: ToolType.builtin,
  availability: createMemoryToolsAvailability(getCoreStart),
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Remember',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Write a short-term memory for this space.
    Memory is shared with users and agents that can read Context Engine memory in this space. Only
    record findings useful to others working in this context, such as discovered patterns,
    effective approaches, or domain knowledge. Do not record personal details or individual user
    preferences.
    Use memory.session_fact for a granular fact discovered during a session.
    Use memory.session for a synthesis of what was tried, what worked, and what should be done
    differently. Omit id to create a memory; provide an id returned by an earlier call only when
    deliberately revising that memory. This tool handles session metadata, the conversation
    reference, and provenance server-side. For MCP calls, omit sessionId unless continuing with the
    sessionId returned by an earlier remember call. Agent Builder calls ignore sessionId and use
    the current conversation ID. Memory expires ${MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS} days after
    each write by default; provide expires_at to expire it sooner.
  `,
  schema: rememberSchema,
  handler: async ({ sessionId, ...params }, context) => {
    const { request, runContext, logger, callContext } = context;
    const agent = getAgentFromRunContext(runContext);
    const conversationId = agent?.conversationId || undefined;

    if (!conversationId && callContext?.callSource !== 'mcp') {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Cannot store memory outside an Agent Builder conversation.' },
          },
        ],
      };
    }

    try {
      const memoryService = (await getContextEngineStart()).getMemoryService({ request });
      const result = await memoryService.remember({
        ...params,
        session_id: conversationId ?? sessionId,
        writer: createMemoryWriter({
          toolId: contextEngineMemoryTools.remember,
          runId: runContext.runId,
          agentId: agent?.agentId,
        }),
        references: createConversationReferences(conversationId),
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { id: result.id, sessionId: result.session_id },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.remember}: ${message}`, { error });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to store memory: ${message}` },
          },
        ],
      };
    }
  },
});
