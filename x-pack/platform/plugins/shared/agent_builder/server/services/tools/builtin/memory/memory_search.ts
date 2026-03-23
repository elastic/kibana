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

const memorySearchSchema = z.object({
  query: z
    .string()
    .max(1000)
    .describe(
      'Search query to find relevant memory entries. Matched against titles, content, tags, and paths.'
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe('Optional tag filter — only return entries with at least one of these tags.'),
  parent_path: z
    .string()
    .optional()
    .describe(
      'Optional path prefix to scope the search (e.g. "architecture" to search only under architecture/).'
    ),
  size: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of results to return (defaults to 10).'),
});

export const createMemorySearchTool = ({
  getMemoryService,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memorySearchSchema> => ({
  id: platformCoreTools.memorySearch,
  type: ToolType.builtin,
  description:
    'Search the shared memory for relevant entries. Returns metadata and short snippets only — ' +
    'use memory_read to get full content of specific entries. ' +
    'Memory contains persistent knowledge accumulated across conversations.',
  schema: memorySearchSchema,
  tags: ['memory'],
  handler: async ({ query, tags, parent_path: parentPath, size }, context) => {
    const memoryService = getMemoryService();
    const { spaceId } = context;

    try {
      const results = await memoryService.search({
        query,
        space: spaceId,
        tags,
        parentPath,
        size,
      });

      if (results.length === 0) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                message: 'No memory entries found matching the query.',
                query,
                total: 0,
                items: [],
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              total: results.length,
              items: results.map((r) => ({
                id: r.id,
                path: r.path,
                title: r.title,
                snippet: r.snippet,
                score: r.score,
                updated_at: r.updated_at,
                updated_by: r.updated_by,
              })),
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory search failed: ${(error as Error).message}`,
            metadata: { query },
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
          summary: `Memory search for "${data.query}" returned ${data.total} results`,
          total: data.total,
        },
      },
    ];
  },
});
