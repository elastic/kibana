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
import { randomUUID } from 'crypto';
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import {
  MAX_SESSION_MEMORY_CONTENT_LENGTH,
  MAX_SESSION_MEMORY_ID_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import { SESSION_MEMORY_TYPE_SUGGESTIONS } from '@kbn/context-engine-plugin/common/http_api/session_memory';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';

/** Agent id recorded for MCP calls, which run outside an Agent Builder agent. */
const MCP_AGENT_ID = 'mcp';

const rememberSchema = lazySchema(() =>
  z.object({
    content: z
      .string()
      .min(1)
      .max(MAX_SESSION_MEMORY_CONTENT_LENGTH)
      .describe('The memory, in enough words to use it later without re-deriving it.'),
    type: z
      .string()
      .min(1)
      .max(MAX_SESSION_MEMORY_ID_LENGTH)
      .optional()
      .describe(
        `Optional category, for example ${SESSION_MEMORY_TYPE_SUGGESTIONS.join(
          ', '
        )}. Any other short label is accepted.`
      ),
    aiIndexId: aiIndexIdFieldSchema
      .optional()
      .describe(
        'Optional Context Engine AI-index registry ID to scope the memory to. Use the ID from the agent AI INDICES configuration, not the backing Elasticsearch index or data stream name.'
      ),
    sessionId: z
      .string()
      .min(1)
      .max(MAX_SESSION_MEMORY_ID_LENGTH)
      .optional()
      .describe(
        'For MCP calls only: omit unless continuing a memory session using the sessionId returned by an earlier remember call. Do not invent a value. Agent Builder calls ignore this input and use the current conversation ID.'
      ),
  })
);

export const createRememberTool = ({
  getContextEngineStart,
  getCoreStart,
  getSecurityStart,
  generateSessionId = randomUUID,
}: {
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
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
    Store a memory for the current user and session in Context Engine session memory.
    Memories are scoped to the user, the session (the current conversation), and this agent, and
    can be recalled across sessions. Record what will be useful later: preferences the user
    stated, facts established, decisions made, or a summary of what was tried. Optionally scope
    the memory to an AI index with aiIndexId. For MCP calls, omit sessionId unless continuing with
    the sessionId returned by an earlier remember call. Agent Builder calls ignore sessionId and use
    the current conversation ID.
  `,
  schema: rememberSchema,
  handler: async (params, context) => {
    const { request, spaceId, runContext, logger, callContext } = context;
    const agent = getAgentFromRunContext(runContext);
    const conversationId = agent?.conversationId || undefined;
    const isMcpCall = callContext?.callSource === 'mcp';

    if (!conversationId && !isMcpCall) {
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
      const sessionId = conversationId ?? params.sessionId ?? generateSessionId();

      await assertContextEngineWriteAccess({
        request,
        spaceId,
        getCoreStart,
        getSecurityStart,
      });

      const coreStart = await getCoreStart();
      const userId = coreStart.security.authc.getCurrentUser(request)?.username;
      if (!userId) {
        throw new Error('Cannot determine the current user.');
      }

      const stored = await (await getContextEngineStart()).getSessionMemoryService().remember({
        session_id: sessionId,
        user_id: userId,
        agent_id: agent?.agentId ?? MCP_AGENT_ID,
        space: spaceId,
        ...(params.aiIndexId ? { ai_index_id: [params.aiIndexId] } : {}),
        ...(params.type ? { type: params.type } : {}),
        content: params.content,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { id: stored.id, sessionId },
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
