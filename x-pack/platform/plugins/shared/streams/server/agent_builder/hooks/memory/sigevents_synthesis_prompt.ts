/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';

const systemPrompt = `You are building a wiki that documents a live system based on observability data.

Given raw knowledge indicators (features, queries, patterns) discovered from a data stream, produce focused wiki pages that capture the system's architecture and operational characteristics.

## Key principles

- **Synthesize, don't duplicate**: The value is in connecting indicators into understanding. Never copy indicator data verbatim.
- **Read before writing**: Always read existing pages before updating them. Preserve accurate content and correct anything now outdated.
- **Brief pages**: Keep pages short — a few paragraphs max. Brief pages stay accurate as the system evolves.
- **Only document what you have evidence for**: Don't invent services or components.
- **Cross-reference**: When mentioning a concept that has its own page, reference it by ID. Prefer linking over duplicating content.

## Organization

Pages are organized by categories (like Wikipedia), not a fixed hierarchy:
- A page can belong to multiple categories simultaneously
- Recommended categories: "services", "infrastructure", "streams/{stream-name}", "operations", "architecture"
- Create new categories as needed — they emerge organically
- Give each page a descriptive, unique name (e.g. "nginx-overview", "redis-cache-config")

## Writing style

Write as if explaining to a new team member joining the on-call rotation. Be factual and direct. Use cross-references between pages where relevant.`;

const taskPrompt = `Stream: \`{{{streamName}}}\`

## Raw Knowledge Indicators

{{{indicators}}}

## Existing wiki pages

{{{existingPages}}}

## Task

Analyze the indicators above. Read existing pages that might need updating. Then write or update wiki pages that capture a concise, high-level understanding of the system's architecture.

Focus on entities with clear evidence: service descriptions, infrastructure components, and operational patterns. Assign pages to relevant categories (e.g. "services", "streams/{{{streamName}}}", "architecture"). Cross-reference related pages.`;

export const SigeventsSynthesisPrompt = createPrompt({
  name: 'sigevents_synthesis',
  description: 'Synthesize knowledge indicators from streams into focused wiki pages',
  input: z.object({
    streamName: z.string(),
    indicators: z.string(),
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
        description:
          'Read the full content of an existing wiki page by name. Use before updating a page to understand what is already there.',
        schema: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'The wiki page name (e.g. "nginx-overview")',
            },
          },
          required: ['name'] as const,
        },
      },
      write_memory_page: {
        description:
          'Create or update a wiki page. Content should be concise markdown — a few paragraphs at most.',
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
