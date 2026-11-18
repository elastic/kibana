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
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import {
  DEFAULT_RECALL_MAX_TOKENS,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SESSION_ID_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import type { RecallSource } from '@kbn/context-engine-plugin/common/http_api/memory_recall';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getSessionMemoryScope } from '../session_memory_scope';

const recallSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_RECALL_QUERY_LENGTH)
      .describe('What to look for, in natural language. Matched by meaning, not by keyword.'),
    aiIndexId: aiIndexIdFieldSchema
      .optional()
      .describe(
        'A memory-enabled AI index from the agent AI INDICES configuration to recall from as well. Omit when the agent has none.'
      ),
    session_id: z
      .string()
      .min(1)
      .max(MAX_RECALL_SESSION_ID_LENGTH)
      .optional()
      .describe(
        'Limits recall to one conversation. Omit to search every conversation of the current user.'
      ),
  })
);

/** Demo only: recalls through the Context Engine Recall service as the logged-in user. */
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
    Search what the current user told you before, in this conversation or in earlier ones: the
    memories saved with the remember tool and the messages of past conversations, plus the AI index
    when you pass aiIndexId. Use it whenever an answer may depend on something the user or an
    earlier session told you, such as their preferences, facts about their environment, or past
    decisions, before saying you don't know. Returns the most relevant results as text, one per
    line, each starting with its id. A memory's id can be passed to the forget tool.
  `,
  schema: recallSchema,
  handler: async ({ query, aiIndexId, session_id: sessionId }, context) => {
    const { request, spaceId, logger } = context;

    try {
      await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });
      const { userId } = await getSessionMemoryScope({ request, spaceId, getCoreStart });
      const sources: RecallSource[] = ['session_memory', 'session_events'];
      if (aiIndexId !== undefined) {
        sources.push('ai_index');
      }

      const response = await (
        await getContextEngineStart()
      ).recallMemory({
        request,
        body: {
          query,
          user_id: userId,
          ...(sessionId !== undefined && { session_ids: [sessionId] }),
          ...(aiIndexId !== undefined && { ai_index_ids: [aiIndexId] }),
          sources,
          max_tokens: DEFAULT_RECALL_MAX_TOKENS,
          format: 'text',
        },
      });

      return { results: [{ type: ToolResultType.other, data: response }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.recall}: ${message}`, { error });
      return {
        results: [
          { type: ToolResultType.error, data: { message: `Failed to recall: ${message}` } },
        ],
      };
    }
  },
});
