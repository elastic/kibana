/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const GetResultsStepTypeId = 'osquery.getResults';

export const GetResultsInputSchema = z.object({
  action_id: z.string().min(1, 'action_id is required'),
  query_action_id: z.string().optional(),
  max_rows: z.number().min(1).max(10000).optional().default(1000),
});

export const GetResultsOutputSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  row_count: z.number(),
  responded_agents: z.number(),
  total_agents: z.number(),
  status: z.enum(['success', 'partial', 'not_found']),
});

export const GetResultsConfigSchema = z.object({}).partial();

export type GetResultsStepInput = z.infer<typeof GetResultsInputSchema>;
export type GetResultsStepOutput = z.infer<typeof GetResultsOutputSchema>;

export const getResultsStepCommonDefinition: CommonStepDefinition<
  typeof GetResultsInputSchema,
  typeof GetResultsOutputSchema,
  typeof GetResultsConfigSchema
> = {
  id: GetResultsStepTypeId,
  category: StepCategory.Kibana,
  label: 'Get query results',
  description: 'Fetch results from a previously executed osquery action.',
  documentation: {
    details:
      'Retrieves result rows from a completed or in-progress osquery action. For packs, iterate over `output.queries` from the runPack step and pass each `query_action_id`.',
    examples: [
      `## Fetch results from a single query
\`\`\`yaml
- name: get_results
  type: ${GetResultsStepTypeId}
  with:
    action_id: "{{ steps.run_query.output.action_id }}"
    max_rows: 500
\`\`\``,
      `## Iterate over pack query results
\`\`\`yaml
- name: fetch_all
  type: foreach
  foreach: "{{ steps.run_pack.output.queries }}"
  steps:
    - name: get_result
      type: ${GetResultsStepTypeId}
      with:
        action_id: "{{ steps.run_pack.output.action_id }}"
        query_action_id: "{{ foreach.item.action_id }}"
    - name: log
      type: console
      with:
        message: "{{ foreach.item.name }}: {{ steps.get_result.output.row_count }} rows"
\`\`\``,
    ],
  },
  inputSchema: GetResultsInputSchema,
  outputSchema: GetResultsOutputSchema,
  configSchema: GetResultsConfigSchema,
};
