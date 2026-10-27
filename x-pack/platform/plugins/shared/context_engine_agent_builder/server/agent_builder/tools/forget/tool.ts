/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { SHORT_TERM_MEMORY_LIMITS, ToolType } from '@kbn/agent-builder-common';
import { contextEngineMemoryTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  ShortTermMemoryNotFoundError,
  type BuiltinToolDefinition,
} from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { getShortTermMemoryClient, resolveMemoryAgentId } from '../short_term_memory_context';

const forgetSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(SHORT_TERM_MEMORY_LIMITS.idLength)
    .describe('The id of the memory to delete'),
});

export const createForgetTool = ({
  getCoreStart,
}: {
  getCoreStart: () => Promise<CoreStart>;
}): BuiltinToolDefinition<typeof forgetSchema> => ({
  id: contextEngineMemoryTools.forget,
  type: ToolType.builtin,
  availability: createMemoryToolsAvailability(getCoreStart),
  tags: ['context_engine', 'memory'],
  annotations: {
    title: 'Forget',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Permanently delete one of the current user's short-term memories with this agent, so it is no
    longer recalled. Provide the id returned by remember or recall, or shown in the MEMORY section.
    A memory already promoted into long-term memory stays there; this only removes the short-term
    copy.
  `,
  schema: forgetSchema,
  handler: async ({ id }, context) => {
    const { runContext, logger } = context;
    try {
      const client = await getShortTermMemoryClient(context);
      const existing = await client.get(id);
      if (existing.agent_id !== resolveMemoryAgentId({ runContext })) {
        throw new ShortTermMemoryNotFoundError(id);
      }
      await client.delete(id);
      return { results: [{ type: ToolResultType.other, data: { id } }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${contextEngineMemoryTools.forget}: ${message}`, { error });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to forget memory: ${message}` },
          },
        ],
      };
    }
  },
});
