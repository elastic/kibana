/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPrompt } from '@kbn/inference-common';
import { askQuestionToolDefinition } from '../../memory/ask_question_tool';

const systemPrompt = `You are a concise technical writer maintaining a wiki about a live system's architecture based on observability data.

## Your goal

Synthesize knowledge indicators (features, insights, queries) discovered from a data stream into focused, high-level wiki pages. Each page should be a brief architectural overview — NOT a rehash of raw data.

## Key principles

- **Brevity over completeness**: Keep pages short (a few paragraphs max). Brief pages stay accurate as the system evolves; sprawling pages become stale and misleading.
- **Synthesize, don't duplicate**: The value is in connecting information across multiple indicators and noting relationships. NEVER copy indicator data verbatim. Reference indicator types loosely (e.g. "based on error pattern analysis and service dependency data") rather than reproducing details.
- **Relationships are the prize**: The most valuable insight is how things connect — which services depend on which, what infrastructure supports what, which error patterns correlate. Focus on these connections.
- **Only fetch what you need**: You have access to indicator summaries. Use \`get_indicator_details\` selectively to understand specifics — don't fetch every indicator.
- **Read before writing**: Before updating an existing page, read it with \`read_memory_page\` to understand what's already there. Preserve accurate content, correct outdated information, and add genuinely new insights.
## Asking questions

Actively use the \`ask_question\` tool — this is one of your most important responsibilities. Use it in two situations:

1. **Quality issues** (category: "quality"): contradictions between indicators and existing pages, ambiguous data that could be interpreted multiple ways, information that seems stale or suspicious. Do NOT guess — ask.
2. **Knowledge gaps** (category: "gap"): areas where you can see *something* is happening but lack the context to document it properly. For example: a service appears in error logs but has no documentation, a dependency is implied but not confirmed, or a pattern is visible but its root cause is unknown.

After writing or updating pages, review what you wrote and consider: what would a new on-call engineer still need to know that isn't covered? Ask those questions.

## Page conventions

Organize pages by path:
- \`architecture/{stream}/overview\` — what the stream carries, its role, key characteristics
- \`architecture/{stream}/services/{name}\` — per-service: role, dependencies, communication patterns
- \`architecture/{stream}/infrastructure/{name}\` — per-component: role, configuration, operational characteristics
- \`operations/{stream}/patterns\` — failure modes, error correlations, things to watch

Only create pages for entities you have evidence for. Keep paths lowercase with hyphens.

## Writing style

Write as if explaining to a new team member joining the on-call rotation. Be factual and direct. Use cross-references between pages where relevant.`;

const taskPrompt = `Stream: \`{{{streamName}}}\`

## Available indicators ({{indicatorCount}} total)

{{{indicatorSummaries}}}

## Existing wiki pages

{{{existingPages}}}

## Task

Review the indicator summaries above. Fetch details for indicators that seem important for understanding the system architecture and relationships. Read any existing pages that need updating. Then write or update wiki pages that capture a concise, high-level understanding of this stream's architecture.

Remember: brief pages that capture relationships across indicators are far more valuable than detailed pages that repeat raw data.

After writing pages, use \`ask_question\` to flag any contradictions you noticed and to highlight gaps — areas where you can see something is happening but lack the context to document it properly.`;

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
          'Read the full content of an existing wiki page by path. Use before updating a page to understand what is already there.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path (e.g. "architecture/logs.otel/overview")',
            },
          },
          required: ['path'] as const,
        },
      },
      write_memory_page: {
        description:
          'Create or update a wiki page. If a page already exists at the given path, it will be updated. Content should be concise markdown — a few paragraphs at most.',
        schema: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'The wiki page path (e.g. "architecture/logs.otel/services/nginx")',
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

// ── Question Answer Prompt ──

const questionAnswerSystemPrompt = `You are updating a knowledge base based on a user's answer to a question about the knowledge base state.

Use the available tools to:
1. Read the related memory entries to understand the current state
2. Read other entries if needed for cross-referencing
3. Write updated pages or create new ones to incorporate the answer

Guidelines:
- Incorporate the user's answer naturally into the entry content
- Preserve the existing structure and writing style of entries
- If the answer makes an entry obsolete, delete it
- If the answer affects multiple entries, update all of them`;

const questionAnswerTaskPrompt = `## Question that was asked
{{{question}}}

## User's answer
{{{answer}}}

## Related entry IDs
{{{related_entry_ids}}}

## All memory entries (index)
{{{entry_index}}}

Start by reading the related entries, then decide what updates are needed based on the user's answer.`;

export const QuestionAnswerPrompt = createPrompt({
  name: 'memory_question_answer',
  description: 'Incorporate a user answer to a memory question into wiki pages',
  input: z.object({
    question: z.string(),
    answer: z.string(),
    entry_index: z.string(),
    related_entry_ids: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: questionAnswerSystemPrompt,
      },
    },
    template: {
      mustache: {
        template: questionAnswerTaskPrompt,
      },
    },
    tools: {
      read_entry: {
        description:
          'Read the full content of a memory entry by its ID. Use to inspect entries before updating them.',
        schema: {
          type: 'object' as const,
          properties: {
            entry_id: {
              type: 'string' as const,
              description: 'The ID of the memory entry to read',
            },
          },
          required: ['entry_id'] as const,
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
          },
          required: ['path', 'title', 'content'] as const,
        },
      },
      delete_entry: {
        description: 'Delete a memory entry by ID. Use when the answer makes an entry obsolete.',
        schema: {
          type: 'object' as const,
          properties: {
            entry_id: {
              type: 'string' as const,
              description: 'The ID of the entry to delete',
            },
          },
          required: ['entry_id'] as const,
        },
      },
    } as const,
  })
  .get();
