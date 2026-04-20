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

const memoryListSchema = z.object({
  category: z
    .string()
    .optional()
    .describe(
      'List pages in this category (e.g. "services" or "streams/logs-otel"). Omit to list all pages.'
    ),
  show_category_tree: z
    .boolean()
    .optional()
    .describe(
      'If true, return the full category tree structure instead of a flat page list. Default: false.'
    ),
});

export const createMemoryListTool = ({
  getMemoryService,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryListSchema> => ({
  id: platformStreamsMemoryTools.memoryList,
  type: ToolType.builtin,
  description:
    'Browse memory pages by category or as a category tree. Returns metadata only (no content) — ' +
    'use memory_read to get content of specific pages. ' +
    'Shows names, titles, categories, and whether pages have references.',
  schema: memoryListSchema,
  tags: ['memory'],
  handler: async ({ category, show_category_tree: showCategoryTree }, context) => {
    const memoryService = getMemoryService();

    try {
      if (showCategoryTree) {
        const tree = await memoryService.getCategoryTree();
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

      const entries = category
        ? await memoryService.listByCategory({ category })
        : await memoryService.listAll();

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              category: category ?? 'all',
              total: entries.length,
              items: entries.map((e) => ({
                id: e.id,
                name: e.name,
                title: e.title,
                categories: e.categories,
                references: e.references,
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
          summary: `Listed ${data.total ?? 'tree'} memory pages${
            data.category && data.category !== 'all' ? ` in "${data.category}"` : ''
          }`,
        },
      },
    ];
  },
});
