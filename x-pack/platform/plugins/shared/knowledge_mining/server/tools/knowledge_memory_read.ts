/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryServiceImpl, SuggestionServiceImpl } from '../services';

const readSchema = z.object({
  path: z
    .string()
    .describe('The virtual file path of the memory to read (e.g., "project/architecture.md")'),
});

export const knowledgeMemoryReadTool = (
  getServices: () => {
    memoryService: MemoryServiceImpl;
    suggestionService: SuggestionServiceImpl;
  }
): BuiltinToolDefinition<typeof readSchema> => {
  return {
    id: 'knowledge_memory_read',
    type: ToolType.builtin,
    description: `Read the full content of a specific memory from the knowledge base by its virtual file path.
Use this after searching to get the complete content of a specific memory.`,
    schema: readSchema,
    handler: async ({ path }, { request, logger }) => {
      logger.debug(`knowledge_memory_read called with path: ${path}`);
      const { memoryService } = getServices();
      const client = memoryService.getScopedClient({ request });

      const memory = await client.getByPath(path);
      if (!memory) {
        return {
          results: [
            {
              type: 'error' as const,
              message: `No memory found at path: ${path}`,
            },
          ],
        };
      }

      return {
        results: [
          {
            type: 'knowledge_memory' as const,
            id: memory.id,
            path: memory.path,
            title: memory.title,
            content: memory.content,
            memory_type: memory.memory_type,
            tags: memory.tags,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
          },
        ],
      };
    },
    tags: [],
  };
};
