/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformStreamsMemoryTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { getUserFromRequest } from './get_user_from_request';
import type { MemoryToolsOptions } from './types';

const memoryDeleteSchema = z.object({
  id: z.string().optional().describe('Delete page by UUID.'),
  name: z.string().optional().describe('Delete page by unique name.'),
});

export const createMemoryDeleteTool = ({
  getMemoryService,
  getSecurity,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryDeleteSchema> => ({
  id: platformStreamsMemoryTools.memoryDelete,
  type: ToolType.builtin,
  description:
    'Delete a memory page. The page is removed but its version history is preserved for auditing.',
  schema: memoryDeleteSchema,
  tags: ['memory'],
  confirmation: { askUser: 'never' },
  handler: async ({ id, name }, context) => {
    const memoryService = getMemoryService();
    const { request, esClient } = context;
    const { username: user } = await getUserFromRequest({
      request,
      security: getSecurity(),
      esClient: esClient.asCurrentUser,
    });

    if (!name && !id) {
      return {
        results: [createErrorResult({ message: 'Either "name" or "id" must be provided.' })],
      };
    }

    try {
      let entryId = id;
      let entryName = name;

      if (!entryId) {
        const entry = await memoryService.getByName({ name: name! });
        if (!entry) {
          return {
            results: [createErrorResult({ message: `Memory page not found with name: ${name}` })],
          };
        }
        entryId = entry.id;
        entryName = entry.name;
      }

      await memoryService.delete({ id: entryId!, user });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              deleted: true,
              name: entryName,
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
