/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { ToolType } from '@kbn/agent-builder-common';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import {
  getShortTermMemoryClient,
  resolveMemoryAgentId,
  toMemoryToolResult,
} from '../short_term_memory_context';

const MAX_RECALL_QUERY_LENGTH = 1024;
const DEFAULT_RECALL_LIMIT = 5;
const MAX_RECALL_LIMIT = 20;

const recallSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(MAX_RECALL_QUERY_LENGTH)
    .describe('Words to search the memories for, such as an index name, a feature, or a topic'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_RECALL_LIMIT)
    .optional()
    .describe(`How many memories to return. Defaults to ${DEFAULT_RECALL_LIMIT}.`),
});

export const createRecallTool = ({
  getCoreStart,
}: {
  getCoreStart: () => Promise<CoreStart>;
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
    Search the current user's short-term memories with this agent, best match first. Use it when
    the MEMORY section does not already cover the task. It only searches this user's memories, so
    pass only a query. Long-term memory shared through an AI index is searched with the AI index
    tools instead.
  `,
  schema: recallSchema,
  handler: async ({ query, limit = DEFAULT_RECALL_LIMIT }, context) => {
    const { runContext, logger } = context;
    try {
      const client = await getShortTermMemoryClient(context);
      const memories = await client.search({
        query,
        agentId: resolveMemoryAgentId({ runContext }),
        limit,
      });
      // Recording use keeps these memories from decaying; it must not fail the recall.
      client.markUsed(memories).catch((error) => {
        logger.debug(
          `Failed to record short-term memory use: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
      return {
        results: [
          { type: ToolResultType.other, data: { memories: memories.map(toMemoryToolResult) } },
        ],
      };
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
