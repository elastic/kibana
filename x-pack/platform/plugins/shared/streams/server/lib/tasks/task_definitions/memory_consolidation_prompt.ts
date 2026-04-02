/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';

const systemPrompt = `You are a wiki curator responsible for keeping a knowledge base clean, well-organized, and useful.

## Your goal

Review the memory wiki and consolidate, reorganize, and clean up pages to maintain a high-quality knowledge base.

## Operations to consider

1. **Merge duplicates**: If two pages cover the same topic, merge them into one and delete the other.
2. **Remove stale entries**: Delete pages that are outdated, no longer relevant, or contain only trivial information.
3. **Improve categorization**: Ensure pages have appropriate categories. Add missing categories, remove incorrect ones. Categories should help users find pages from different angles.
4. **Add cross-references**: When pages reference concepts that have their own pages, add the reference IDs.
5. **Fill gaps**: If you notice cross-references to pages that don't exist, or obvious gaps in coverage, note them but don't fabricate content.
6. **Consolidate fragments**: If multiple small pages could be a single coherent page, merge them.
7. **Fix inconsistencies**: If pages contradict each other, resolve the contradiction (preferring more recent information).

## Key principles

- **Read before acting**: Always read a page's content before deciding to modify or delete it.
- **Preserve valuable content**: When merging, keep all unique information from both sources.
- **Be conservative with deletion**: Only delete pages that are clearly stale, duplicated, or trivial.
- **Maintain cross-references**: When merging or deleting pages, update any pages that reference them.
- **Skip system pages**: Don't modify pages with names starting with \`_system/\`.`;

const taskPrompt = `## Current wiki state ({{entryCount}} pages)

{{{existingPages}}}

## Task

Review the wiki pages above. Read pages that might need consolidation, and perform cleanup operations:
- Merge duplicate or highly overlapping pages
- Remove stale or trivial entries
- Improve categorization so pages can be found from multiple angles
- Add missing cross-references between related pages
- Fix any inconsistencies between pages

Work through the pages methodically. Not every page needs changes — focus on the highest-impact improvements.`;

export const MemoryConsolidationPrompt = createPrompt({
  name: 'memory_consolidation',
  description: 'Consolidate and clean up memory wiki pages',
  input: z.object({
    entryCount: z.number(),
    existingPages: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPrompt,
      },
    },
    template: {
      mustache: {
        template: taskPrompt,
      },
    },
    tools: {
      read_memory_page: {
        description: 'Read the full content of a wiki page by name.',
        schema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'The wiki page name',
            },
          },
          required: ['name'] as const,
        },
      },
      write_memory_page: {
        description: 'Create or update a wiki page.',
        schema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'Unique page name',
            },
            title: {
              type: 'string' as const,
              description: 'Human-readable page title',
            },
            content: {
              type: 'string' as const,
              description: 'Markdown content',
            },
            categories: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Categories this page belongs to',
            },
            references: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'IDs of other pages referenced from this content',
            },
            tags: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Tags for classification',
            },
          },
          required: ['name', 'title', 'content'] as const,
        },
      },
      delete_memory_page: {
        description: 'Delete a wiki page. Use after merging duplicate content into another page.',
        schema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'The wiki page name to delete',
            },
          },
          required: ['name'] as const,
        },
      },
      get_recent_changes: {
        description:
          'Get recent changes across all memory pages. Shows what was changed, by whom, and when. ' +
          'Useful for identifying recently modified pages and understanding edit patterns.',
        schema: {
          type: 'object' as const,
          properties: {
            size: {
              type: 'number' as const,
              description: 'Maximum number of recent changes to return (default 20)',
            },
          },
        },
      },
    } as const,
  })
  .get();
