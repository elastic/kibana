/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { getUserFromRequest } from './get_user_from_request';
import type { MemoryToolsOptions } from './types';

const memoryWriteSchema = z.object({
  path: z
    .string()
    .describe(
      'Wiki path for the entry (e.g. "architecture/web-frontend/overview"). Creates or overwrites.'
    ),
  title: z.string().describe('Human-readable title for the entry.'),
  content: z.string().describe('Full markdown content for the entry.'),
  tags: z.array(z.string()).optional().describe('Optional classification tags.'),
  change_summary: z.string().optional().describe('Human-readable description of what was changed.'),
});

export const createMemoryWriteTool = ({
  getMemoryService,
  getSecurity,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryWriteSchema> => ({
  id: platformCoreTools.memoryWrite,
  type: ToolType.builtin,
  description:
    'Create a new memory entry or overwrite an existing one at a path. ' +
    'For surgical edits to existing entries, prefer memory_patch instead. ' +
    'Use this for new entries or full rewrites.',
  schema: memoryWriteSchema,
  tags: ['memory'],
  confirmation: { askUser: 'never' },
  handler: async ({ path, title, content, tags, change_summary: changeSummary }, context) => {
    const memoryService = getMemoryService();
    const { spaceId, request, esClient } = context;
    const { username: user } = await getUserFromRequest({
      request,
      security: getSecurity(),
      esClient: esClient.asCurrentUser,
    });

    try {
      // Check if entry exists at this path
      const existing = await memoryService.getByPath({ path, space: spaceId });

      if (existing) {
        // Overwrite existing entry
        const updated = await memoryService.update({
          id: existing.id,
          title,
          content,
          tags,
          space: spaceId,
          user,
          changeSummary: changeSummary ?? `Overwrote entry at ${path}`,
        });
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                id: updated.id,
                path: updated.path,
                version: updated.version,
                created: false,
              },
            },
          ],
        };
      }

      // Create new entry
      const created = await memoryService.create({
        path,
        title,
        content,
        tags,
        space: spaceId,
        user,
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              id: created.id,
              path: created.path,
              version: created.version,
              created: true,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory write failed: ${(error as Error).message}`,
            metadata: { path },
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;
    const action = data.created ? 'Created' : 'Updated';
    return [
      {
        ...result,
        data: {
          summary: `${action} memory entry at "${data.path}" (v${data.version})`,
          id: data.id,
          path: data.path,
          version: data.version,
        },
      },
    ];
  },
});
