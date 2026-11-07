/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import { aiIndexIdFieldSchema } from '@kbn/context-engine-plugin/common/ai_index_schemas';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import dedent from 'dedent';
import { hasContextEngineReadPrivilege } from '../../has_context_engine_read_privilege';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getWritableMemoryAiIndex } from '../get_writable_memory_ai_index';
import type { CreateMemorySearch } from '../memory_store';

const MAX_RECALL_QUERY_LENGTH = 2000;
const MAX_RECALL_LIMIT = 50;
const DEFAULT_RECALL_LIMIT = 10;

const recallSchema = lazySchema(() =>
  z.object({
    aiIndexId: aiIndexIdFieldSchema.describe(
      'The Context Engine AI-index registry ID whose memories to search. Use the ID from the agent AI INDICES configuration, not the backing Elasticsearch index or data stream name.'
    ),
    query: z
      .string()
      .min(1)
      .max(MAX_RECALL_QUERY_LENGTH)
      .describe('What you need to know, as a natural-language question or phrase'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RECALL_LIMIT)
      .optional()
      .default(DEFAULT_RECALL_LIMIT)
      .describe(`(Optional) Maximum memories to return. Defaults to ${DEFAULT_RECALL_LIMIT}.`),
  })
);

const createRecallAvailability = (
  getCoreStart: () => Promise<CoreStart>,
  createMemorySearch: CreateMemorySearch | undefined
): ToolAvailabilityConfig => {
  const memoryToolsAvailability = createMemoryToolsAvailability(getCoreStart);
  return {
    cacheMode: 'none',
    handler: async (context) =>
      createMemorySearch
        ? memoryToolsAvailability.handler(context)
        : {
            status: 'unavailable',
            reason: 'Memories in this deployment are recalled by querying AI Indices.',
          },
  };
};

export const createRecallTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  createMemorySearch,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  createMemorySearch?: CreateMemorySearch;
}): BuiltinToolDefinition<typeof recallSchema> => ({
  id: contextEngineMemoryTools.recall,
  type: ToolType.builtin,
  availability: createRecallAvailability(getCoreStart, createMemorySearch),
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Recall',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: dedent`
    Search the memories recorded with the remember tool in a memory-enabled Context Engine AI index.
    Call it before starting work in an AI index's domain to reuse discovered patterns, effective
    approaches, and domain knowledge. Returns the most relevant active, unexpired memories. Each
    result has the memory id to pass to remember (to revise it) or forget (to delete it).
  `,
  schema: recallSchema,
  handler: async ({ aiIndexId, query, limit }, context) => {
    const { request, spaceId, esClient, logger } = context;

    try {
      if (!createMemorySearch) {
        throw new Error('Memory recall is not available in this deployment.');
      }
      if (!(await hasContextEngineReadPrivilege({ security: await getSecurityStart(), request }))) {
        throw new Error('You do not have privileges to read Context Engine memories.');
      }

      const aiIndex = await getWritableMemoryAiIndex({
        aiIndexId,
        spaceId,
        request,
        getAiIndexService,
        getCoreStart,
      });

      const memories = await createMemorySearch({
        aiIndexId,
        dest: aiIndex.dest,
        spaceId,
        esClient: esClient.asCurrentUser,
      }).search({ query, limit });

      return { results: [{ type: ToolResultType.other, data: { memories } }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.recall}: ${message}`, { error });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to recall memories: ${message}` },
          },
        ],
      };
    }
  },
});
