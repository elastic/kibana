/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';

const memoryListSchema = z.object({
  parent_path: z
    .string()
    .optional()
    .describe('List entries under this path. Omit to list root-level entries.'),
  recursive: z
    .boolean()
    .optional()
    .describe(
      'If true, return the full tree structure instead of just direct children. Default: false.'
    ),
});

export const createMemoryListTool = ({
  getMemoryService,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryListSchema> => ({
  id: platformCoreTools.memoryList,
  type: ToolType.builtin,
  description:
    'Browse the memory hierarchy. Returns metadata only (no content) — ' +
    'use memory_read to get content of specific entries. ' +
    'Shows paths, titles, line counts, and whether entries have children.',
  schema: memoryListSchema,
  tags: ['memory'],
  handler: async ({ parent_path: parentPath, recursive }, context) => {
    const memoryService = getMemoryService();
    const { spaceId } = context;

    try {
      if (recursive) {
        const tree = await memoryService.getTree({ space: spaceId });
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { tree },
            },
          ],
        };
      }

      const entries = await memoryService.listChildren({
        parentPath: parentPath ?? '',
        space: spaceId,
      });

      // Collect all parent paths to determine which entries have children
      const allEntries = await memoryService.listAll({ space: spaceId });
      const parentPaths = new Set(allEntries.map((e) => e.parent_path));

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              parent_path: parentPath ?? '',
              total: entries.length,
              items: entries.map((e) => ({
                id: e.id,
                path: e.path,
                title: e.title,
                has_children: parentPaths.has(e.path),
                updated_at: e.updated_at,
                updated_by: e.updated_by,
                line_count: e.content.split('\n').length,
              })),
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory list failed: ${(error as Error).message}`,
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
          summary: `Listed ${data.total ?? 'tree'} memory entries under "${
            data.parent_path ?? '/'
          }"`,
        },
      },
    ];
  },
});
