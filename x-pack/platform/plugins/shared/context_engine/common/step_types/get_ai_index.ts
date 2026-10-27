/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { aiIndexIdSchema } from './ki';

export const GET_AI_INDEX_STEP_ID = 'context-engine.getAiIndex' as const;

export const getAiIndexInputSchema = z.object({
  ai_index_id: aiIndexIdSchema,
});

export const getAiIndexOutputSchema = z.object({
  id: z.string().describe('The AI index id'),
  description: z.string().optional().describe('What the AI index holds'),
  managed: z.boolean().describe('Whether a plugin owns the AI index definition'),
  memory_enabled: z.boolean().describe('Whether the AI index holds long-term memory'),
  dest: z
    .object({ type: z.enum(['data_stream', 'index']), value: z.string() })
    .describe('The backing store. `value` is the ES|QL `FROM` target'),
  traces: z
    .array(
      z.object({
        type: z.enum(['elastic_agent', 'index', 'esql']),
        value: z.string(),
        query: z.string().describe('The ES|QL query that reads this trace source'),
      })
    )
    .describe('Trace sources configured on the AI index, each with its resolved ES|QL query'),
});

export type GetAiIndexOutput = z.infer<typeof getAiIndexOutputSchema>;

export const getAiIndexStepCommonDefinition: CommonStepDefinition<
  typeof getAiIndexInputSchema,
  typeof getAiIndexOutputSchema
> = {
  id: GET_AI_INDEX_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.getAiIndex.label', {
    defaultMessage: 'Get AI index',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.getAiIndex.description', {
    defaultMessage: 'Read an AI index definition, including the queries for its trace sources.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: getAiIndexInputSchema,
  outputSchema: getAiIndexOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.getAiIndex.documentation.details',
      {
        defaultMessage:
          'Returns the AI index definition as it is now, so an automation picks up changes to its trace sources without being reinstalled. Each trace source comes with the ES|QL query that reads it; append a time filter and a LIMIT before running it.',
      }
    ),
    examples: [
      `## Read the trace queries of an AI index
\`\`\`yaml
- name: ai_index
  type: ${GET_AI_INDEX_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
- name: log_traces
  type: console
  with:
    message: "{{ steps.ai_index.output.traces | map: 'query' | json }}"
\`\`\``,
    ],
  },
};
