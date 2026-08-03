/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { AiIndexProperties } from '../../../common/http_api/ai_indices';
import { contextEngineToolIds } from '../../../common/agent_builder/constants';
import { AiIndexConflictError, AiIndexManagedError, AiIndexNotFoundError } from '../../ai_indices/errors';
import type { AiIndexService } from '../../ai_indices/service';

const updateAiIndexSchema = z.object({
  ai_index_id: z.string().describe('The id of the AI index to update.'),
  description: z.string().optional().describe('A new human-readable description.'),
  sources: z
    .array(z.object({ type: z.literal('esql'), value: z.string() }))
    .optional()
    .describe('Replaces the declared sources (ES|QL queries) wholesale.'),
  self_improvement: z
    .object({ enabled: z.boolean(), traces_index: z.string() })
    .optional()
    .describe('Self-improvement configuration.'),
});

/** Partially updates an AI index (description, sources, or self-improvement config). */
export const updateAiIndexTool = ({
  getAiIndexService,
}: {
  getAiIndexService: () => AiIndexService;
}): BuiltinToolDefinition<typeof updateAiIndexSchema> => ({
  id: contextEngineToolIds.updateAiIndex,
  type: ToolType.builtin,
  description:
    'Update a Context Engine AI index: its description, its declared sources, or its self-improvement configuration. Does not change automations — use save_automation for that.',
  tags: ['context-engine'],
  schema: updateAiIndexSchema,
  handler: async ({ ai_index_id: aiIndexId, description, sources, self_improvement: selfImprovement }) => {
    const patch: Partial<AiIndexProperties> = {
      ...(description !== undefined ? { description } : {}),
      ...(sources !== undefined ? { sources } : {}),
      ...(selfImprovement !== undefined ? { self_improvement: selfImprovement } : {}),
    };
    try {
      const updated = await getAiIndexService().patch(aiIndexId, patch);
      return { results: [{ type: ToolResultType.other, data: updated }] };
    } catch (error) {
      if (
        error instanceof AiIndexNotFoundError ||
        error instanceof AiIndexManagedError ||
        error instanceof AiIndexConflictError
      ) {
        return { results: [{ type: ToolResultType.error, data: { message: error.message } }] };
      }
      throw error;
    }
  },
});
