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

const searchSchema = z.object({
  query: z.string().describe('A natural language query to search the knowledge base'),
  memory_type: z
    .enum(['factual', 'procedural', 'contextual', 'preference'])
    .optional()
    .describe('Optional filter by memory type'),
  tags: z.array(z.string()).optional().describe('Optional filter by tags'),
  limit: z.number().optional().describe('Maximum number of results to return (default: 10)'),
});

export const knowledgeMemorySearchTool = (
  getServices: () => {
    memoryService: MemoryServiceImpl;
    suggestionService: SuggestionServiceImpl;
  }
): BuiltinToolDefinition<typeof searchSchema> => {
  return {
    id: 'knowledge_memory_search',
    type: ToolType.builtin,
    description: `Search the persistent knowledge base for relevant information.
The knowledge base contains persistent memories extracted from previous conversations,
including facts, procedures, preferences, and contextual information.
Use this tool to find relevant knowledge before answering questions.`,
    schema: searchSchema,
    handler: async ({ query, memory_type: memoryType, tags, limit }, { request, logger }) => {
      logger.debug(`knowledge_memory_search called with query: ${query}`);
      const { memoryService } = getServices();
      const client = memoryService.getScopedClient({ request });

      const memories = await client.search(query, {
        memory_type: memoryType,
        tags,
        limit: limit ?? 10,
      });

      return {
        results: memories.map((memory) => ({
          type: 'knowledge_memory' as const,
          id: memory.id,
          path: memory.path,
          title: memory.title,
          content: memory.content,
          memory_type: memory.memory_type,
          tags: memory.tags,
        })),
      };
    },
    tags: [],
  };
};
