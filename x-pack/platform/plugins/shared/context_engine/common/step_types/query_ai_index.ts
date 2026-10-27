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
import {
  MAX_AI_INDEX_QUERY_LENGTH,
  MAX_AI_INDEX_QUERY_LIMIT,
  MAX_AI_INDEX_QUERY_PARAMS,
  MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH,
  MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH,
} from '../constants';

export const QUERY_AI_INDEX_STEP_ID = 'context-engine.queryAiIndex' as const;

export const queryAiIndexInputSchema = z.object({
  query: z.string().min(1).max(MAX_AI_INDEX_QUERY_LENGTH).describe('The ES|QL query to run'),
  params: z
    .record(
      z.string().min(1).max(MAX_AI_INDEX_QUERY_PARAM_KEY_LENGTH),
      z.union([z.string().max(MAX_AI_INDEX_QUERY_PARAM_VALUE_LENGTH), z.number(), z.boolean()])
    )
    .refine((params) => Object.keys(params).length <= MAX_AI_INDEX_QUERY_PARAMS, {
      message: `params must have at most ${MAX_AI_INDEX_QUERY_PARAMS} entries`,
    })
    .optional()
    .describe('Named parameters for `?name` placeholders in the query'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_AI_INDEX_QUERY_LIMIT)
    .optional()
    .describe('Maximum rows to return. Defaults to 100.'),
});

export const queryAiIndexOutputSchema = z.object({
  columns: z.array(z.object({ name: z.string(), type: z.string() })),
  values: z.array(z.array(z.unknown())),
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .describe('The same rows as objects keyed by column name'),
});

export type QueryAiIndexInput = z.infer<typeof queryAiIndexInputSchema>;

export const queryAiIndexStepCommonDefinition: CommonStepDefinition<
  typeof queryAiIndexInputSchema,
  typeof queryAiIndexOutputSchema
> = {
  id: QUERY_AI_INDEX_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.queryAiIndex.label', {
    defaultMessage: 'Query AI indices',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.queryAiIndex.description', {
    defaultMessage:
      'Run ES|QL against AI indices with the knowledge indicator lifecycle and space filters applied.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: queryAiIndexInputSchema,
  outputSchema: queryAiIndexOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.queryAiIndex.documentation.details',
      {
        defaultMessage:
          'Runs the query as the workflow owner, the same way the AI index query API does: a query that reads a registered AI index only sees current, active, unexpired knowledge indicators of the workflow space, and the row count is capped. Unlike a plain ES|QL step, deleted and expired knowledge indicators never reach the workflow. Other indices, such as trace indices, are read as they are.',
      }
    ),
    examples: [
      `## Read the current long-term memories of an AI index
\`\`\`yaml
- name: memories
  type: ${QUERY_AI_INDEX_STEP_ID}
  with:
    query: 'FROM ai-index-idx-support | WHERE type LIKE "memory.*" | KEEP id, type, title, description, content, tags'
    limit: 200
\`\`\``,
    ],
  },
};
