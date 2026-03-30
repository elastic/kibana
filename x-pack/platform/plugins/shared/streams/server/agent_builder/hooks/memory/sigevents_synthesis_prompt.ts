/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';
import { askQuestionToolDefinition } from '../../../lib/memory/ask_question_tool';

const systemPrompt = `You are building a wiki that documents a live system based on observability data.

Given raw knowledge indicators (features, queries, patterns) discovered from a data stream, produce focused wiki pages that capture the system's architecture and operational characteristics.

## Key principles

- **Synthesize, don't duplicate**: The value is in connecting indicators into understanding. Never copy indicator data verbatim.
- **Read before writing**: Always read existing pages before updating them. Preserve accurate content and correct anything now outdated.
- **Brief pages**: Keep pages short — a few paragraphs max. Brief pages stay accurate as the system evolves.
- **Only document what you have evidence for**: Don't invent services or components.
- **Ask when uncertain**: If you encounter contradictions or ambiguities you cannot resolve from the data, use \`ask_question\` to queue a question for the human operator.

## Page conventions

- \`stream/{stream}/overview\` — what the stream carries, its role, key characteristics
- \`stream/{stream}/services/{name}\` — per-service: role, dependencies, communication patterns
- \`stream/{stream}/infrastructure/{name}\` — per-component: role, configuration, operational characteristics
- \`stream/{stream}/patterns\` — failure modes, error correlations, things to watch

## Writing style

Write as if explaining to a new team member joining the on-call rotation. Be factual and direct. Use cross-references between pages where relevant (e.g. "See also: [Service X](stream/{stream}/services/x)").`;

const taskPrompt = `Stream: \`{{{streamName}}}\`

## Raw Knowledge Indicators

{{{indicators}}}

## Existing wiki pages

{{{existingPages}}}

## Task

Analyze the indicators above. Read existing pages that might need updating. Then write or update wiki pages that capture a concise, high-level understanding of this stream's architecture.

Focus on entities with clear evidence: the stream overview, distinct services, infrastructure components, and operational patterns.`;

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
          'Read the full content of an existing wiki page by path. Use before updating a page to understand what is already there.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path (e.g. "stream/logs.otel/overview")',
            },
          },
          required: ['path'] as const,
        },
      },
      write_memory_page: {
        description:
          'Create or update a wiki page. Content should be concise markdown — a few paragraphs at most.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path (e.g. "stream/logs.otel/services/nginx")',
            },
            title: {
              type: 'string' as const,
              description: 'Human-readable page title',
            },
            content: {
              type: 'string' as const,
              description: 'Concise markdown content for the page',
            },
            tags: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Tags for classification (e.g. ["architecture", "logs.otel"])',
            },
          },
          required: ['path', 'title', 'content', 'tags'] as const,
        },
      },
      ask_question: askQuestionToolDefinition,
    } as const,
  })
  .get();
