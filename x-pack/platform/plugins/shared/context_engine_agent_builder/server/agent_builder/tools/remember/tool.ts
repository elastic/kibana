/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import dedent from 'dedent';
import {
  SHORT_TERM_MEMORY_LIMITS,
  SHORT_TERM_MEMORY_TYPES,
  ToolType,
} from '@kbn/agent-builder-common';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  ShortTermMemoryNotFoundError,
  type BuiltinToolDefinition,
} from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import { isoDateTime, z } from '@kbn/zod/v4';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import {
  getShortTermMemoryClient,
  resolveMemoryAgentId,
  resolveMemorySessionId,
  toMemoryToolResult,
} from '../short_term_memory_context';

const rememberSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(SHORT_TERM_MEMORY_LIMITS.idLength)
    .optional()
    .describe('The id of an existing memory to revise. Omit when creating a new memory.'),
  sessionId: z
    .string()
    .min(1)
    .max(SHORT_TERM_MEMORY_LIMITS.idLength)
    .optional()
    .describe(
      'For MCP calls only: omit unless continuing a memory session using the sessionId returned by an earlier remember call. Do not invent a value. Agent Builder calls ignore this input and use the current conversation ID.'
    ),
  type: z
    .enum(SHORT_TERM_MEMORY_TYPES)
    .describe(
      'Use memory.session_fact for a granular fact or preference, or memory.session for a synthesis of what was tried, what worked, and what to do differently. When revising a memory, use its existing type.'
    ),
  title: z
    .string()
    .min(1)
    .max(SHORT_TERM_MEMORY_LIMITS.titleLength)
    .describe('A short label for the memory'),
  description: z
    .string()
    .min(1)
    .max(SHORT_TERM_MEMORY_LIMITS.descriptionLength)
    .describe('A concise description of the memory and its immediate consequence'),
  content: z
    .string()
    .min(1)
    .max(SHORT_TERM_MEMORY_LIMITS.contentLength)
    .describe('Enough context to use the memory without re-deriving it'),
  tags: z
    .array(z.string().min(1).max(SHORT_TERM_MEMORY_LIMITS.tagLength))
    .max(SHORT_TERM_MEMORY_LIMITS.tags)
    .optional()
    .describe(
      'Optional lowercase index names, feature areas, or tools associated with the memory. When revising, omit to preserve existing tags or pass an empty array to clear them.'
    ),
  expires_at: isoDateTime({ offset: true })
    .nullable()
    .optional()
    .describe(
      'ISO 8601 timestamp after which the memory must not be recalled. If omitted, the memory expires 30 days after this write, including when revising. Set to null to make it non-expiring.'
    ),
});

export const createRememberTool = ({
  getCoreStart,
  generateSessionId = randomUUID,
}: {
  getCoreStart: () => Promise<CoreStart>;
  generateSessionId?: () => string;
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
    Write a short-term memory. Short-term memory is private to the current user and this agent,
    and persists across their conversations. Record durable preferences, corrections, and facts
    about the user's environment that would save work next time. Do not record secrets or
    credentials. Pass only the memory content: the user, agent, and session are recorded
    server-side. Omit id to create a memory; pass an id returned by an earlier call or shown in the
    MEMORY section to revise that memory. Memories expire 30 days after each write unless
    expires_at says otherwise. Automations may later promote generally useful memories into
    long-term memory shared through an AI index.
  `,
  schema: rememberSchema,
  handler: async (params, context) => {
    const { runContext, callContext, logger } = context;
    try {
      const sessionId = resolveMemorySessionId({
        runContext,
        callContext,
        requestedSessionId: params.sessionId,
        generateSessionId,
      });
      if (sessionId === undefined) {
        throw new Error('Cannot store memory outside an Agent Builder conversation.');
      }
      const agentId = resolveMemoryAgentId({ runContext });
      const client = await getShortTermMemoryClient(context);
      const { id, sessionId: _sessionId, ...content } = params;

      if (id !== undefined) {
        const existing = await client.get(id);
        if (existing.agent_id !== agentId) {
          throw new ShortTermMemoryNotFoundError(id);
        }
        if (existing.type !== content.type) {
          throw new Error(
            `Memory '${id}' has type '${existing.type}' and cannot be revised as '${content.type}'.`
          );
        }
        const revised = await client.update(id, content);
        return {
          results: [
            { type: ToolResultType.other, data: { ...toMemoryToolResult(revised), sessionId } },
          ],
        };
      }

      const created = await client.create({ ...content, agentId, sessionId });
      return {
        results: [
          { type: ToolResultType.other, data: { ...toMemoryToolResult(created), sessionId } },
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
