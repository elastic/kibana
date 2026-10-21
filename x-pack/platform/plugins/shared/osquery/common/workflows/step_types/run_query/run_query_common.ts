/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';

export const RunQueryStepId = 'osquery.runQuery' as const;

export const runQueryInputSchema = lazySchema(() =>
  z.object({
    saved_query_id: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[^/]+$/, 'saved_query_id cannot contain "/"'),
    agent_ids: z.array(z.string().min(1)).min(1).max(250),
    wait_timeout: z
      .string()
      .regex(/^[1-9][0-9]*(s|m|h)$/, 'Use a duration such as 30s, 5m or 1h')
      .optional(),
    max_rows: z.number().int().min(1).max(10000).optional(),
  })
);

export const runQueryOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['success', 'partial', 'timed_out', 'failed']),
    error_code: z.string().optional(),
    action_id: z.string().optional(),
    agents: z.object({
      total: z.number(),
      responded: z.number(),
      pending: z.number(),
      failed: z.number(),
    }),
    rows: z.array(
      z.object({
        agent: z.object({ id: z.string(), name: z.string().optional() }),
        '@timestamp': z.string().optional(),
        columns: z.record(z.string(), z.string()),
        ecs: z.record(z.string(), z.unknown()),
      })
    ),
    row_count: z.number(),
    truncated: z.boolean(),
  })
);

export type RunQueryInput = z.infer<typeof runQueryInputSchema>;
export type RunQueryOutput = z.infer<typeof runQueryOutputSchema>;

export const runQueryStepCommonDefinition: BaseStepDefinition<
  typeof runQueryInputSchema,
  typeof runQueryOutputSchema
> = {
  id: RunQueryStepId,
  label: i18n.translate('xpack.osquery.workflows.steps.runQuery.label', {
    defaultMessage: 'Run Osquery Saved Query',
  }),
  description: i18n.translate('xpack.osquery.workflows.steps.runQuery.description', {
    defaultMessage:
      'Run an osquery saved query on the given agents and wait for the answers. Never fails after the query is dispatched: the outcome is returned in `status` (`success`, `partial`, `timed_out` or `failed`) and every row carries the host it came from in `agent`.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: runQueryInputSchema,
  outputSchema: runQueryOutputSchema,
  documentation: {
    details: i18n.translate('xpack.osquery.workflows.steps.runQuery.documentation.details', {
      defaultMessage:
        'Reads the saved query `saved_query_id` in the current space and runs it on `agent_ids`, waiting up to `wait_timeout` (default 5m, maximum 30m). Returns at most `max_rows` rows (default 1000); `row_count` is the total and `truncated` tells whether rows were cut.',
    }),
    examples: [
      `## Run a saved query on one agent
\`\`\`yaml
- name: procs
  type: osquery.runQuery
  with:
    saved_query_id: "{{ inputs.saved_query_id }}"
    agent_ids: ["{{ inputs.agent_id }}"]
    wait_timeout: 2m
    max_rows: 50
\`\`\``,
    ],
  },
};
