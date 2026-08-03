/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { contextEngineToolIds } from '../../../common/agent_builder/constants';
import { AiIndexNotFoundError } from '../../ai_indices/errors';
import type { AiIndexService } from '../../ai_indices/service';

const getAiIndexSchema = z.object({
  ai_index_id: z.string().describe('The id of the AI index to read.'),
});

/** Reads the current state of an AI index (sources, automations, self-improvement config). */
export const getAiIndexTool = ({
  getAiIndexService,
}: {
  getAiIndexService: () => AiIndexService;
}): BuiltinToolDefinition<typeof getAiIndexSchema> => ({
  id: contextEngineToolIds.getAiIndex,
  type: ToolType.builtin,
  description:
    'Read the current state of a Context Engine AI index: its description, sources, automations, and self-improvement configuration.',
  tags: ['context-engine'],
  schema: getAiIndexSchema,
  handler: async ({ ai_index_id: aiIndexId }) => {
    try {
      const aiIndex = await getAiIndexService().get(aiIndexId);
      return { results: [{ type: ToolResultType.other, data: aiIndex }] };
    } catch (error) {
      if (error instanceof AiIndexNotFoundError) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `AI index '${aiIndexId}' does not exist.` },
            },
          ],
        };
      }
      throw error;
    }
  },
});
