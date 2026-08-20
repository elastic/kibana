/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { MemoryService } from '../../memory_and_investigation/lib/memory';

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
        'Search the knowledge base for relevant pages about system architecture, services, and operational patterns. Returns metadata and snippets — use memory_read for full content.',
      schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description: 'Search query to match against titles, content, tags, and categories.',
          },
          categories: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'Optional category filter to scope the search.',
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
      description: 'Read the full content of a specific knowledge base page by name or ID.',
      schema: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string' as const,
            description: 'Read page by its unique name (e.g. "nginx-overview").',
          },
          id: {
            type: 'string' as const,
            description: 'Read page by UUID.',
          },
        },
      },
    },
    memory_list: {
      description:
        'List all knowledge base pages. Returns names, titles, categories, and IDs only — use memory_read for full content.',
      schema: {
        type: 'object' as const,
        properties: {},
      },
    },
  };

  const callbacks: Record<string, ToolCallback> = {
    memory_search: async (toolCall) => {
      const { query, categories, size } = toolCall.function.arguments as {
        query: string;
        categories?: string[];
        size?: number;
      };
      try {
        const results = await memoryService.search({
          query,
          categories,
          size,
        });
        return {
          response: {
            results: results.map(({ id, name, title, snippet, tags, categories: cats }) => ({
              id,
              name,
              title,
              snippet,
              tags,
              categories: cats,
            })),
          },
        };
      } catch (error) {
        return { response: { error: String(error), results: [] } };
      }
    },
    memory_read: async (toolCall) => {
      const { name, id } = toolCall.function.arguments as { name?: string; id?: string };
      if (!name && !id) {
        return { response: { error: 'Either "name" or "id" must be provided.' } };
      }
      try {
        let entry;
        if (id) {
          entry = await memoryService.get({ id });
        } else if (name) {
          entry = await memoryService.getByName({ name });
        }
        if (!entry) {
          return { response: { error: 'Page not found' } };
        }
        return {
          response: {
            id: entry.id,
            name: entry.name,
            title: entry.title,
            content: entry.content,
            categories: entry.categories,
            references: entry.references,
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
            entries: entries.map(({ id, name, title, tags, categories }) => ({
              id,
              name,
              title,
              tags,
              categories,
            })),
          },
        };
      } catch (error) {
        return { response: { error: String(error), entries: [] } };
      }
    },
  };

  const promptSnippet = `
You have access to a knowledge base ("memory") that stores what the system has learned about monitored services, infrastructure, operational patterns, known-benign noise, and prior false positives. Pages are organized by categories (like Wikipedia).

**Required grounding step:** before you finalize your output, you MUST call \`memory_search\` at least once — scoped to the services, symptoms, and patterns you are considering — to ground your work in prior learnings. Treat this as mandatory, never optional: finalizing without first consulting memory is an error. An empty memory result is acceptable and expected; skipping the search is not.

- **memory_search** — Search by keyword to find relevant pages (supports category filter)
- **memory_read** — Read the full content of a specific page by name or ID
- **memory_list** — List all pages to discover what knowledge exists

Use memory to avoid regenerating known-bad / demoted patterns and to prefer outputs aligned with durable prior learnings. Still ground everything you propose in the current stream data; memory is prior context, not a substitute for evidence.`;

  return { tools, callbacks, promptSnippet };
};
