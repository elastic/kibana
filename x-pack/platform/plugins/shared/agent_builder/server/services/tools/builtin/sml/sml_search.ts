/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { SmlService } from '../../../sml';

const smlSearchSchema = z.object({
  query: z.string().describe('Semantic query to search the semantic metadata layer'),
  size: z.number().min(1).max(100).optional().describe('Maximum number of results to return'),
});

export const createSmlSearchTool = ({
  getSmlService,
}: {
  getSmlService: () => SmlService | undefined;
}): BuiltinToolDefinition<typeof smlSearchSchema> => ({
  id: platformCoreTools.smlSearch,
  type: ToolType.builtin,
  description:
    'Search the Semantic Metadata Layer (SML) for indexed attachments. Results are permission-checked for the current user.',
  schema: smlSearchSchema,
  tags: ['sml', 'attachment'],
  handler: async ({ query, size }, context) => {
    const smlService = getSmlService();
    if (!smlService) {
      return {
        results: [
          createErrorResult({
            message: 'Semantic metadata search is not available yet.',
          }),
        ],
      };
    }

    const { results, total } = await smlService.search({
      request: context.request,
      query,
      size,
      spaceId: context.spaceId,
    });

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            total,
            results,
          },
        },
      ],
    };
  },
});
