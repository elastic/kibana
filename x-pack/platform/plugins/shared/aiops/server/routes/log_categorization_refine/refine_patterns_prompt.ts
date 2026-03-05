/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import type { ToolSchema } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

export const CLASSIFY_PATTERNS_TOOL_NAME = 'classify_patterns';

const classificationSchema = z.object({
  pattern_key: z.string().describe('The exact pattern key from the input list'),
  label: z.enum(['important', 'noise']).describe('Whether this pattern is important or noise'),
});

const classifyPatternsToolArgsZodSchema = z.object({
  classifications: z
    .array(classificationSchema)
    .describe(
      'Classification for every pattern: important (errors, failures, rare events) or noise (routine info, health checks)'
    ),
});

export const classifyPatternsToolSchema = z.toJSONSchema(classifyPatternsToolArgsZodSchema, {
  reused: 'ref',
}) as unknown as ToolSchema;

export type RefinePatternsInput = z.infer<typeof refinePatternsInputSchema>;

export const refinePatternsInputSchema = z.object({
  categories: z.array(
    z.object({
      key: z.string(),
      count: z.number(),
      examples: z.array(z.string()),
    })
  ),
  fieldName: z.string().optional(),
});

export const RefinePatternsPrompt = createPrompt({
  name: 'refine_log_patterns',
  description: 'Classify log patterns as important or noise for pattern analysis',
  input: refinePatternsInputSchema,
})
  .version({
    system: `You are classifying log patterns for an observability / log analysis product.
Your task is to label each pattern as "important" or "noise".

**Important** patterns are worth attention when investigating issues, for example:
- Errors, exceptions, failures, timeouts
- Security or auth-related messages
- Rare or unusual events
- Warnings that may indicate problems
- Messages that suggest degraded or failing behavior

**Noise** patterns are routine or low-value for investigation, for example:
- Routine health checks, heartbeats, "service started"
- High-volume repetitive info (e.g. "item added to cart", "request received")
- Debug or verbose logging that is normally irrelevant
- Successful operation confirmations that are not actionable

You must call the classify_patterns tool exactly once with a classification for every pattern in the input list. Use the exact pattern_key values from the input.`,
    template: {
      mustache: {
        template: `Classify each of the following log patterns as important or noise.

{{#fieldName}}
Field: {{fieldName}}
{{/fieldName}}

Patterns (key, count, example lines):
{{#categories}}
- key: {{key}}, count: {{count}}, examples: {{#examples}}{{.}} | {{/examples}}
{{/categories}}
`,
      },
    },
    tools: {
      [CLASSIFY_PATTERNS_TOOL_NAME]: {
        description:
          'Call once with the classification for every pattern. Include every pattern_key from the input with exactly one label: "important" or "noise".',
        schema: classifyPatternsToolSchema,
      },
    },
  })
  .get();

export function parseClassificationsFromResponse(response: {
  toolCalls?: Array<{ function: { name: string; arguments: unknown } }>;
}): Array<{ pattern_key: string; label: 'important' | 'noise' }> {
  if (!response.toolCalls?.length) {
    return [];
  }
  const toolCall = response.toolCalls.find(
    (tc) => tc.function?.name === CLASSIFY_PATTERNS_TOOL_NAME
  );
  if (!toolCall?.function?.arguments) {
    return [];
  }
  const parsed = classifyPatternsToolArgsZodSchema.safeParse(
    typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments
  );
  if (!parsed.success) {
    return [];
  }
  return parsed.data.classifications;
}
