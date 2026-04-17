/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './memory_synthesis_system_prompt.text';
import taskPromptTemplate from './memory_synthesis_task_prompt.text';

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
        template: systemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: taskPromptTemplate,
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
              description: 'Unique page name (e.g. "nginx-service", "streams-logs-otel-overview")',
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
                'Categories (e.g. ["services", "streams/logs-otel"]). Prefer services, infrastructure, or operations; use architecture only for holistic cross-stream docs.',
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
