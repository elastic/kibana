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
  MAX_KI_CONTENT_LENGTH,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_SESSION_ID_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getWritableMemoryAiIndex } from '../get_writable_memory_ai_index';
import { getSessionMemoryScope } from '../session_memory_scope';

const rememberSchema = lazySchema(() =>
  z.object({
    content: z
      .string()
      .min(1)
      .max(MAX_KI_CONTENT_LENGTH)
      .describe(
        'The memory, as one self-contained statement that makes sense without this conversation.'
      ),
    id: z
      .string()
      .min(1)
      .max(MAX_SESSION_MEMORY_ID_LENGTH)
      .optional()
      .describe(
        'The id of an existing memory to revise; the revision replaces it in full. Omit when creating a new memory.'
      ),
    aiIndexId: aiIndexIdFieldSchema
      .optional()
      .describe(
        'A memory-enabled AI index from the agent AI INDICES configuration that dreaming may later promote this memory into. Omit when the agent has none.'
      ),
    sessionId: z
      .string()
      .min(1)
      .max(MAX_SESSION_MEMORY_SESSION_ID_LENGTH)
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
    Save a memory about the current user to their session memory, so you can recall it in this and
    later conversations with the recall tool. Use it when the user asks you to remember something,
    or shares a lasting preference, fact about their environment, or decision. Write the memory as
    one self-contained statement. Omit id to create a memory; pass an id returned by an earlier call
    only to revise that memory. Memories belong to the current user and are not shared with other
    users. For MCP calls, omit sessionId unless continuing with the sessionId returned by an
    earlier remember call. Agent Builder calls ignore sessionId and use the current conversation ID.
  `,
  schema: rememberSchema,
  handler: async ({ content, id, aiIndexId, sessionId: requestedSessionId }, context) => {
    const { request, spaceId, runContext, logger, callContext } = context;
    const conversationId = getAgentFromRunContext(runContext)?.conversationId || undefined;

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
      const sessionId = conversationId ?? requestedSessionId ?? generateSessionId();
      await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

      const contextEngine = await getContextEngineStart();
      if (aiIndexId !== undefined) {
        await getWritableMemoryAiIndex({
          aiIndexId,
          spaceId,
          request,
          getAiIndexService: async () => contextEngine.getAiIndexService(),
          getCoreStart,
        });
      }

      const scope = await getSessionMemoryScope({ request, spaceId, getCoreStart });
      const { id: memoryId } = await contextEngine.getSessionMemoryService().remember(scope, {
        id,
        sessionId,
        content,
        aiIndexIds: aiIndexId !== undefined ? [aiIndexId] : [],
      });

      return { results: [{ type: ToolResultType.other, data: { id: memoryId, sessionId } }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.remember}: ${message}`, { error });
      return {
        results: [
          { type: ToolResultType.error, data: { message: `Failed to store memory: ${message}` } },
        ],
      };
    }
  },
});
