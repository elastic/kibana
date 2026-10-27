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
import { MAX_KI_ID_LENGTH } from '@kbn/context-engine-plugin/common/step_types/ki';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { createMemoryToolsAvailability } from '../ai_index_tools_availability';
import { createMemoryWriter } from '../memory_document';

const forgetSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(MAX_KI_ID_LENGTH)
    .describe('The ID of the existing memory to mark as deleted'),
});

export const createForgetTool = ({
  getContextEngineStart,
  getCoreStart,
}: {
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
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
    idempotentHint: true,
    openWorldHint: false,
  },
  description: dedent`
    Mark a short-term memory in this space as deleted so it is no longer recalled. Provide the id
    returned by the remember tool. The memory remains stored as a lifecycle tombstone.
  `,
  schema: forgetSchema,
  handler: async ({ id }, context) => {
    const { request, runContext, logger } = context;

    try {
      const agent = getAgentFromRunContext(runContext);
      const memoryService = (await getContextEngineStart()).getMemoryService({ request });
      const result = await memoryService.forget({
        id,
        writer: createMemoryWriter({
          toolId: contextEngineMemoryTools.forget,
          runId: runContext.runId,
          agentId: agent?.agentId,
        }),
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { id: result.id },
          },
        ],
      };
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
