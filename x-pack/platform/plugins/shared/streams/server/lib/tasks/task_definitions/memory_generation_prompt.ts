/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';

const systemPrompt = `You are a concise technical writer maintaining a wiki about a live system's architecture based on observability data.

## Your goal

Synthesize knowledge indicators (features, insights, queries) discovered from a data stream into focused, high-level wiki pages. Each page should be a brief architectural overview — NOT a rehash of raw data.

## Key principles

- **Brevity over completeness**: Keep pages short (a few paragraphs max). Brief pages stay accurate as the system evolves; sprawling pages become stale and misleading.
- **Synthesize, don't duplicate**: The value is in connecting information across multiple indicators and noting relationships. NEVER copy indicator data verbatim. Reference indicator types loosely (e.g. "based on error pattern analysis and service dependency data") rather than reproducing details.
- **Relationships are the prize**: The most valuable insight is how things connect — which services depend on which, what infrastructure supports what, which error patterns correlate. Focus on these connections.
- **Only fetch what you need**: You have access to indicator summaries. Use \`get_indicator_details\` selectively to understand specifics — don't fetch every indicator.
- **Read before writing**: Before updating an existing page, read it with \`read_memory_page\` to understand what's already there. Preserve accurate content, correct outdated information, and add genuinely new insights.
- **Cross-reference**: When a page mentions a concept that has its own page, reference it. Prefer linking over duplicating content.

## Organization

Pages are organized by categories (like Wikipedia), not a fixed hierarchy:
- A page can belong to multiple categories simultaneously
- Recommended categories: "services", "infrastructure", "streams/{stream-name}", "operations", "architecture"
- Give each page a descriptive, unique name (e.g. "nginx-service-overview", "redis-cache-patterns")
- Create categories as needed — they emerge organically

## Writing style

Write as if explaining to a new team member joining the on-call rotation. Be factual and direct. Use cross-references between pages where relevant.`;

const taskPrompt = `Stream: \`{{{streamName}}}\`

## Available indicators ({{indicatorCount}} total)

{{{indicatorSummaries}}}

## Existing wiki pages

{{{existingPages}}}

## Task

Review the indicator summaries above. Fetch details for indicators that seem important for understanding the system architecture and relationships. Read any existing pages that need updating. Then write or update wiki pages that capture a concise, high-level understanding of this system's architecture.

Assign pages to relevant categories (e.g. "services", "streams/{{{streamName}}}", "architecture"). Cross-reference related pages by ID.

Remember: brief pages that capture relationships across indicators are far more valuable than detailed pages that repeat raw data.`;

export const MemorySynthesisPrompt = createPrompt({
  name: 'memory_synthesis',
  description: 'Synthesize knowledge indicators into concise architectural wiki pages',
  input: z.object({
    streamName: z.string(),
    indicatorCount: z.number(),
    indicatorSummaries: z.string(),
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
      get_indicator_details: {
        description:
          'Fetch full details of a specific indicator by its index number. Use selectively — only fetch indicators you need to understand for synthesis.',
        schema: {
          type: 'object' as const,
          properties: {
            index: {
              type: 'number' as const,
              description: 'The index of the indicator to fetch (from the summaries list)',
            },
          },
          required: ['index'] as const,
        },
      },
      read_memory_page: {
        description:
          'Read the full content of an existing wiki page by name. Use before updating a page to understand what is already there.',
        schema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'The wiki page name (e.g. "nginx-service-overview")',
            },
          },
          required: ['name'] as const,
        },
      },
      write_memory_page: {
        description:
          'Create or update a wiki page. If a page already exists with the given name, it will be updated. Content should be concise markdown — a few paragraphs at most.',
        schema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'Unique page name (e.g. "nginx-service-overview")',
            },
            title: {
              type: 'string' as const,
              description: 'Human-readable page title',
            },
            content: {
              type: 'string' as const,
              description: 'Concise markdown content for the page',
            },
            categories: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description:
                'Categories this page belongs to (e.g. ["services", "streams/logs-otel"])',
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
          required: ['name', 'title', 'content', 'categories'] as const,
        },
      },
    } as const,
  })
  .get();
