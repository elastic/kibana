/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';

const systemPrompt = `You are a knowledge curator extracting reusable learnings from chat conversations about an observability system.

## Your goal

Review conversations between users and an AI assistant. Extract durable knowledge — things that would help the next person working with these data streams — and persist them as concise wiki pages.

## Key principles

- **Extract knowledge, not conversation**: Don't summarize what was said. Distill what was *learned* — architectural facts, operational patterns, troubleshooting steps, configuration details.
- **Skip ephemeral content**: Ignore greetings, debugging sessions that led nowhere, questions about UI navigation, and other content that won't be useful in the future.
- **Merge with existing knowledge**: Read existing pages before writing. Update them with new information rather than creating duplicates.
- **Be selective**: Not every conversation contains durable knowledge. It's fine to process conversations and write nothing if they don't contain reusable information.
- **Attribute patterns, not conversations**: Write "the nginx service uses port 8080" not "in a conversation, the user mentioned nginx uses port 8080".
- **Cross-reference**: When mentioning a concept that has its own page, reference it by ID. Prefer linking over duplicating content.

## Organization

Pages are organized by categories (like Wikipedia), not a fixed hierarchy:
- Assign pages to relevant categories (e.g. "services", "operations", "streams/{stream-name}")
- A page can belong to multiple categories
- Give each page a descriptive, unique name (e.g. "nginx-port-config", "deploy-checklist")

## Writing style

Write as if documenting for a team wiki. Be factual, direct, and concise. A few paragraphs per page maximum.`;

const taskPrompt = `## Conversations to review ({{conversationCount}} total)

{{{conversationSummaries}}}

## Existing wiki pages

{{{existingPages}}}

## Task

Review the conversation summaries above. Fetch details for conversations that look like they contain reusable knowledge (architecture, troubleshooting, configuration, patterns). Read relevant existing pages. Then write or update wiki pages that capture the durable learnings.

Assign pages to relevant categories. Cross-reference related pages by ID.

Skip conversations that are purely ephemeral (simple questions, UI help, debugging dead-ends).`;

export const ConversationScraperPrompt = createPrompt({
  name: 'conversation_scraper',
  description: 'Extract durable knowledge from chat conversations into wiki pages',
  input: z.object({
    conversationCount: z.number(),
    conversationSummaries: z.string(),
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
      get_conversation_details: {
        description:
          'Fetch the full rounds of a conversation by its index number. Returns user messages and assistant responses.',
        schema: {
          type: 'object' as const,
          properties: {
            index: {
              type: 'number' as const,
              description: 'The index of the conversation to fetch (from the summaries list)',
            },
          },
          required: ['index'] as const,
        },
      },
      read_memory_page: {
        description:
          'Read the full content of an existing wiki page by name. Use before updating a page.',
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
        description: 'Create or update a wiki page. Content should be concise markdown.',
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
              description: 'Concise markdown content',
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
    } as const,
  })
  .get();
