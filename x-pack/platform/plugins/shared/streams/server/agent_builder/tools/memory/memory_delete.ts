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
import { getUserFromRequest } from './get_user_from_request';
import type { MemoryToolsOptions } from './types';

const memoryDeleteSchema = z.object({
  id: z.string().optional().describe('Delete entry by UUID.'),
  path: z.string().optional().describe('Delete entry by wiki path.'),
});

export const createMemoryDeleteTool = ({
  getMemoryService,
  getSecurity,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryDeleteSchema> => ({
  id: platformCoreTools.memoryDelete,
  type: ToolType.builtin,
  description:
    'Delete a memory entry. The entry is removed but its version history is preserved for auditing.',
  schema: memoryDeleteSchema,
  tags: ['memory'],
  confirmation: { askUser: 'never' },
  handler: async ({ id, path }, context) => {
    const memoryService = getMemoryService();
    const { spaceId, request, esClient } = context;
    const { username: user } = await getUserFromRequest({
      request,
      security: getSecurity(),
      esClient: esClient.asCurrentUser,
    });

    if (!path && !id) {
      return {
        results: [createErrorResult({ message: 'Either "path" or "id" must be provided.' })],
      };
    }

    try {
      let entryId = id;
      let entryPath = path;

      if (!entryId) {
        const entry = await memoryService.getByPath({ path: path!, space: spaceId });
        if (!entry) {
          return {
            results: [createErrorResult({ message: `Memory entry not found at path: ${path}` })],
          };
        }
        entryId = entry.id;
        entryPath = entry.path;
      }

      await memoryService.delete({ id: entryId!, space: spaceId, user });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              deleted: true,
              path: entryPath,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory delete failed: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
});
