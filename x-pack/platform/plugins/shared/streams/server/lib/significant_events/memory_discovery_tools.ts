/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { MemoryService } from '../memory';

/**
 * Memory tool definitions and callbacks for use in discovery flows
 * (executeAsReasoningAgent). Read-only tools only — writing happens
 * in the dedicated memory_generation task after discovery completes.
 */

export interface MemoryDiscoveryTools {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  promptSnippet: string;
}

export const createMemoryDiscoveryTools = ({
  memoryService,
}: {
  memoryService: MemoryService;
}): MemoryDiscoveryTools => {
  const tools: Record<string, ToolDefinition> = {
    memory_search: {
      description:
        'Search the knowledge base for relevant entries about system architecture, services, and operational patterns. Returns metadata and snippets — use memory_read for full content.',
      schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description: 'Search query to match against titles, content, tags, and paths.',
          },
          parent_path: {
            type: 'string' as const,
            description: 'Optional path prefix to scope the search.',
          },
          size: {
            type: 'number' as const,
            description: 'Maximum results to return (default 10).',
          },
        },
        required: ['query'] as const,
      },
    },
    memory_read: {
      description: 'Read the full content of a specific knowledge base entry by path or ID.',
      schema: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string' as const,
            description: 'Read entry by wiki path (e.g. "architecture/nginx/overview").',
          },
          id: {
            type: 'string' as const,
            description: 'Read entry by UUID.',
          },
        },
      },
    },
    memory_list: {
      description:
        'List all knowledge base entries. Returns paths, titles, and IDs only — use memory_read for full content.',
      schema: {
        type: 'object' as const,
        properties: {},
      },
    },
  };

  const callbacks: Record<string, ToolCallback> = {
    memory_search: async (toolCall) => {
      const {
        query,
        parent_path: parentPath,
        size,
      } = toolCall.function.arguments as {
        query: string;
        parent_path?: string;
        size?: number;
      };
      try {
        const results = await memoryService.search({
          query,
          parentPath,
          size,
        });
        return {
          response: {
            results: results.map(({ id, path, title, snippet, tags }) => ({
              id,
              path,
              title,
              snippet,
              tags,
            })),
          },
        };
      } catch (error) {
        return { response: { error: String(error), results: [] } };
      }
    },
    memory_read: async (toolCall) => {
      const { path, id } = toolCall.function.arguments as { path?: string; id?: string };
      try {
        let entry;
        if (id) {
          entry = await memoryService.get({ id });
        } else if (path) {
          entry = await memoryService.getByPath({ path });
        }
        if (!entry) {
          return { response: { error: 'Entry not found' } };
        }
        return {
          response: {
            id: entry.id,
            path: entry.path,
            title: entry.title,
            content: entry.content,
            tags: entry.tags,
          },
        };
      } catch (error) {
        return { response: { error: String(error) } };
      }
    },
    memory_list: async () => {
      try {
        const entries = await memoryService.listAll();
        return {
          response: {
            entries: entries.map(({ id, path, title, tags }) => ({ id, path, title, tags })),
          },
        };
      } catch (error) {
        return { response: { error: String(error), entries: [] } };
      }
    },
  };

  const promptSnippet = `
You have access to a knowledge base ("memory") that stores what the system has learned about monitored services, infrastructure, and operational patterns. Use the memory tools to look up relevant context before generating your analysis:
- **memory_search** — Search by keyword to find relevant entries
- **memory_read** — Read the full content of a specific entry by path or ID
- **memory_list** — List all entries to discover what knowledge exists

Check the knowledge base first if the stream or service being analyzed might have existing documentation.`;

  return { tools, callbacks, promptSnippet };
};
