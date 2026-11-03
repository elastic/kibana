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
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import {
  DEFAULT_SESSION_MEMORY_SEARCH_SIZE,
  MAX_SESSION_MEMORY_SEARCH_SIZE,
} from '@kbn/context-engine-plugin/common/constants';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { hasContextEngineReadPrivilege } from '../../has_context_engine_read_privilege';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';

const recallSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .describe(
        'What to look for, in natural language. Matched by meaning against stored memories.'
      ),
    scope: z
      .enum(['user', 'session'])
      .default('user')
      .describe(
        "'user' (default) searches every session of the current user; 'session' only the current conversation."
      ),
    aiIndexId: aiIndexIdFieldSchema
      .optional()
      .describe(
        'Optional Context Engine AI-index registry ID to restrict results to memories scoped to it.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_SESSION_MEMORY_SEARCH_SIZE)
      .default(DEFAULT_SESSION_MEMORY_SEARCH_SIZE)
      .describe('Maximum number of memories to return, best match first.'),
  })
);

export const createRecallTool = ({
  getContextEngineStart,
  getCoreStart,
  getSecurityStart,
}: {
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): BuiltinToolDefinition<typeof recallSchema> => ({
  id: contextEngineMemoryTools.recall,
  type: ToolType.builtin,
  availability: createMemoryToolsAvailability(getCoreStart),
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Recall',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: dedent`
    Recall memories stored for the current user in Context Engine session memory, matched by
    meaning. Use it before answering when earlier sessions may hold preferences, facts, or decisions
    relevant to the question. By default every session of the user is searched; pass
    scope 'session' to look only at the current conversation. Results come back best match first
    with a relevance score, the memory text, its type, and the session it was recorded in.
  `,
  schema: recallSchema,
  handler: async (params, context) => {
    const { request, spaceId, runContext, logger } = context;
    const agent = getAgentFromRunContext(runContext);
    const conversationId = agent?.conversationId || undefined;

    if (params.scope === 'session' && !conversationId) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Cannot recall session memory outside an Agent Builder conversation.',
            },
          },
        ],
      };
    }

    try {
      if (!(await hasContextEngineReadPrivilege({ security: await getSecurityStart(), request }))) {
        throw new Error('Context Engine read privilege is required.');
      }

      const coreStart = await getCoreStart();
      const userId = coreStart.security.authc.getCurrentUser(request)?.username;
      if (!userId) {
        throw new Error('Cannot determine the current user.');
      }

      const { results } = await (await getContextEngineStart()).getSessionMemoryService().search({
        query: params.query,
        user_id: userId,
        space: spaceId,
        ...(params.scope === 'session' ? { session_id: conversationId } : {}),
        ...(params.aiIndexId ? { ai_index_id: params.aiIndexId } : {}),
        size: params.size,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              memories: results.map(({ _score, memory }) => ({
                id: memory.id,
                score: _score,
                timestamp: memory['@timestamp'],
                session_id: memory.session_id,
                ...(memory.type ? { type: memory.type } : {}),
                ...(memory.content ? { content: memory.content } : {}),
                ...(memory.media?.length
                  ? { media: memory.media.map(({ type }) => ({ type })) }
                  : {}),
              })),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.recall}: ${message}`, { error });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to recall memory: ${message}` },
          },
        ],
      };
    }
  },
});
