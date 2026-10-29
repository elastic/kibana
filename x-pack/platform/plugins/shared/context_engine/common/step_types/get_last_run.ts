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

export const GET_LAST_RUN_STEP_ID = 'context-engine.getLastRun' as const;

const MAX_WINDOW_HOURS = 24 * 365;

export const getLastRunInputSchema = z.object({
  default_hours: z
    .number()
    .int()
    .min(1)
    .max(MAX_WINDOW_HOURS)
    .optional()
    .describe(
      'Hours the window covers on the first run, when there is no earlier run. Defaults to 24.'
    ),
  max_hours: z
    .number()
    .int()
    .min(1)
    .max(MAX_WINDOW_HOURS)
    .optional()
    .describe(
      'Longest window, so a run after a long pause or failures does not read everything since. Defaults to no limit.'
    ),
});

export const getLastRunOutputSchema = z.object({
  first_run: z.boolean().describe('True when this workflow has no earlier successful run.'),
  since: z
    .string()
    .describe(
      'Start of the window to process: when the last successful run started, or default_hours ago on the first run, never further back than max_hours.'
    ),
  hours_since: z.number().describe('Whole hours from `since` to now, rounded up.'),
  last_success: z
    .object({
      execution_id: z.string(),
      started_at: z.string(),
      finished_at: z.string().optional(),
    })
    .optional()
    .describe('The last completed run of this workflow, test runs excluded.'),
});

export type GetLastRunInput = z.infer<typeof getLastRunInputSchema>;
export type GetLastRunOutput = z.infer<typeof getLastRunOutputSchema>;

export const getLastRunStepCommonDefinition: CommonStepDefinition<
  typeof getLastRunInputSchema,
  typeof getLastRunOutputSchema
> = {
  id: GET_LAST_RUN_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.getLastRun.label', {
    defaultMessage: 'Get last run',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.getLastRun.description', {
    defaultMessage:
      'When this workflow last ran successfully, so a run processes only what is new since.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: getLastRunInputSchema,
  outputSchema: getLastRunOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.getLastRun.documentation.details',
      {
        defaultMessage:
          "Reads the workflow's own execution history. The window starts when the last completed run started, not when it finished, so records written while that run was working are read again rather than missed. Failed, cancelled and test runs do not move the window, so their records are retried. Read records idempotently: a window can overlap the previous one.",
      }
    ),
    examples: [
      `## Read traces written since the last successful run
\`\`\`yaml
- name: last_run
  type: ${GET_LAST_RUN_STEP_ID}
  with:
    default_hours: 24
    max_hours: 168
- name: traces
  type: context-engine.queryAiIndex
  with:
    query: "FROM traces-* | WHERE @timestamp >= NOW() - {{ steps.last_run.output.hours_since }} hours"
\`\`\``,
    ],
  },
};
