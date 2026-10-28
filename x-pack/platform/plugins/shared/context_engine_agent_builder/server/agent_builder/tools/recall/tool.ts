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
import {
  DEFAULT_RECALL_SIZE,
  MAX_RECALL_QUERY_LENGTH,
  MAX_RECALL_SIZE,
} from '@kbn/context-engine-plugin/common/memory';
import type { RecallMemoryType } from '@kbn/context-engine-plugin/common/memory';
import type { CoreStart } from '@kbn/core/server';
import { lazySchema, z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import {
  getAiIndexDataReadServiceForUser,
  getErrorMessage,
  type AiIndexToolDeps,
} from '../ai_index_read_service';

const RECALL_TYPE_NAMES = ['fact', 'entity', 'procedure'] as const;

const toMemoryType = (name: (typeof RECALL_TYPE_NAMES)[number]): RecallMemoryType =>
  `memory.${name}` as const;

const recallSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_RECALL_QUERY_LENGTH)
      .describe('What to recall, in plain words: a person, team, system, topic or task.'),
    types: z
      .array(z.enum(RECALL_TYPE_NAMES))
      .min(1)
      .max(RECALL_TYPE_NAMES.length)
      .optional()
      .describe('(Optional) Only recall these kinds of memory. Defaults to all of them.'),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_RECALL_SIZE)
      .optional()
      .default(DEFAULT_RECALL_SIZE)
      .describe(
        `(Optional) How many matching memories to return. Defaults to ${DEFAULT_RECALL_SIZE}, at most ${MAX_RECALL_SIZE}.`
      ),
  })
);

export const createRecallTool = ({
  getCoreStart,
  ...deps
}: AiIndexToolDeps & {
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
    Recall what is known in this space from long-term memory: facts, entities (people, teams,
    systems, services, projects, data) and procedures that dreaming distilled from past sessions.
    Use it before answering questions about who owns, runs or works on something, or how a task
    is done here.

    Returns the matching memories with their content, the links between them and other memories
    (for example "Inference Platform owns perf-canary"), and the linked memories without their
    content. Linked memories are not matches; recall one by name to read it in full.
  `,
  schema: recallSchema,
  handler: async ({ query, types, size }, { esClient, request, logger }) => {
    try {
      const readService = await getAiIndexDataReadServiceForUser({ deps, esClient, request });
      const result = await readService.recall({
        query,
        ...(types ? { types: types.map(toMemoryType) } : {}),
        size,
      });
      return { results: [{ type: ToolResultType.other, data: { ...result } }] };
    } catch (error) {
      const message = getErrorMessage(error);
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
