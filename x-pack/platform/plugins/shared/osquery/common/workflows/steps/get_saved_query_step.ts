/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const GetSavedQueryStepTypeId = 'osquery.getSavedQuery';

export const GetSavedQueryInputSchema = z.object({
  saved_query_id: z.string().min(1, 'saved_query_id is required'),
});

export const GetSavedQueryOutputSchema = z.object({
  id: z.string(),
  query: z.string(),
  description: z.string().optional(),
  platform: z.string().optional(),
  ecs_mapping: z.record(z.string(), z.unknown()).optional(),
  interval: z.number().optional(),
});

export const GetSavedQueryConfigSchema = z.object({}).partial();

export type GetSavedQueryStepInput = z.infer<typeof GetSavedQueryInputSchema>;
export type GetSavedQueryStepOutput = z.infer<typeof GetSavedQueryOutputSchema>;

export const getSavedQueryStepCommonDefinition: CommonStepDefinition<
  typeof GetSavedQueryInputSchema,
  typeof GetSavedQueryOutputSchema,
  typeof GetSavedQueryConfigSchema
> = {
  id: GetSavedQueryStepTypeId,
  category: StepCategory.Kibana,
  label: 'Look up a saved query',
  description: 'Retrieve the definition of an osquery saved query by ID.',
  documentation: {
    details:
      'Looks up a saved query definition including its SQL text, ECS mappings, and metadata. Useful for inspecting query details or including the SQL text in case comments.',
    examples: [
      `## Look up a saved query and use its SQL in a case comment
\`\`\`yaml
- name: get_query
  type: ${GetSavedQueryStepTypeId}
  with:
    saved_query_id: "check-running-processes"

- name: add_comment
  type: cases.addComment
  with:
    case_id: "{{ steps.create_case.output.case.id }}"
    comment: "Ran osquery: {{ steps.get_query.output.query }}"
\`\`\``,
    ],
  },
  inputSchema: GetSavedQueryInputSchema,
  outputSchema: GetSavedQueryOutputSchema,
  configSchema: GetSavedQueryConfigSchema,
};
