/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { platformStreamsMemoryTools } from './tool_ids';
import type { MemoryToolsOptions } from './types';

const memoryRecentChangesSchema = z.object({
  size: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of recent changes to return. Default: 20.'),
});

export const createMemoryRecentChangesTool = ({
  getMemoryService,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryRecentChangesSchema> => ({
  id: platformStreamsMemoryTools.memoryRecentChanges,
  type: ToolType.builtin,
  description:
    'Get recent changes across all memory pages. Returns version history records ' +
    'showing what was changed, by whom, and when. Useful for understanding recent ' +
    'activity and identifying pages that may need consolidation.',
  schema: memoryRecentChangesSchema,
  tags: ['memory'],
  handler: async ({ size }, context) => {
    const memoryService = getMemoryService();

    try {
      const changes = await memoryService.getRecentChanges({ size: size ?? 20 });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: changes.length,
              changes: changes.map((c) => ({
                entry_id: c.entry_id,
                name: c.name,
                title: c.title,
                version: c.version,
                change_type: c.change_type,
                change_summary: c.change_summary,
                created_by: c.created_by,
                created_at: c.created_at,
              })),
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory recent changes failed: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (result.type !== ToolResultType.other) return undefined;
    const data = result.data as Record<string, unknown>;
    return [
      {
        ...result,
        data: {
          summary: `Retrieved ${data.total} recent memory changes`,
        },
      },
    ];
  },
});
