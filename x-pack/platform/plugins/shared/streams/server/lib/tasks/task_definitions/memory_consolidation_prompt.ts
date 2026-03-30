/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';
import { askQuestionToolDefinition } from '../../memory/ask_question_tool';

const systemPrompt = `You are a wiki curator responsible for keeping a knowledge base clean, well-organized, and useful.

## Your goal

Review the memory wiki and consolidate, reorganize, and clean up entries to maintain a high-quality knowledge base.

## Operations to consider

1. **Merge duplicates**: If two pages cover the same topic, merge them into one and delete the other.
2. **Remove stale entries**: Delete pages that are outdated, no longer relevant, or contain only trivial information.
3. **Improve organization**: Move pages to better paths if the current hierarchy doesn't make sense.
4. **Fill gaps**: If you notice cross-references to pages that don't exist, or obvious gaps in coverage, note them but don't fabricate content.
5. **Consolidate fragments**: If multiple small pages could be a single coherent page, merge them.
6. **Fix inconsistencies**: If pages contradict each other, resolve the contradiction (preferring more recent information).

## Key principles

- **Read before acting**: Always read a page's content before deciding to modify or delete it.
- **Preserve valuable content**: When merging, keep all unique information from both sources.
- **Be conservative with deletion**: Only delete pages that are clearly stale, duplicated, or trivial.
- **Maintain cross-references**: When moving or merging pages, update any pages that reference them.
- **Skip system pages**: Don't modify pages under the \`_system/\` path.
- **Ask when uncertain**: If you encounter contradictions or ambiguities you cannot resolve, use \`ask_question\` to queue a question for the human operator.`;

const taskPrompt = `## Current wiki state ({{entryCount}} entries)

{{{existingPages}}}

## Task

Review the wiki entries above. Read pages that might need consolidation, and perform cleanup operations:
- Merge duplicate or highly overlapping pages
- Remove stale or trivial entries
- Improve path organization where it would help navigation
- Fix any inconsistencies between pages

Work through the entries methodically. Not every entry needs changes — focus on the highest-impact improvements.`;

export const MemoryConsolidationPrompt = createPrompt({
  name: 'memory_consolidation',
  description: 'Consolidate and clean up memory wiki entries',
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
        description: 'Read the full content of a wiki page by path.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path',
            },
          },
          required: ['path'] as const,
        },
      },
      write_memory_page: {
        description: 'Create or update a wiki page.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path',
            },
            title: {
              type: 'string' as const,
              description: 'Human-readable page title',
            },
            content: {
              type: 'string' as const,
              description: 'Markdown content',
            },
            tags: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Tags for classification',
            },
          },
          required: ['path', 'title', 'content'] as const,
        },
      },
      delete_memory_page: {
        description: 'Delete a wiki page. Use after merging duplicate content into another page.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path to delete',
            },
          },
          required: ['path'] as const,
        },
      },
      ask_question: askQuestionToolDefinition,
      get_recent_changes: {
        description:
          'Get recent changes across all memory entries. Shows what was changed, by whom, and when. ' +
          'Useful for identifying recently modified entries and understanding edit patterns.',
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
