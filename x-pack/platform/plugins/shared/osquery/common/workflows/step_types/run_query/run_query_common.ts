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
import { OutputErrorCode } from '../../contract/error_codes';
import {
  commonInputShape,
  EXACTLY_ONE_TARGET_MESSAGE,
  hasExactlyOneTarget,
  queryResultShape,
} from '../../contract/schemas';

export const RunQueryStepId = 'osquery.runQuery' as const;

export const runQueryInputSchema = lazySchema(() =>
  z
    .strictObject({
      saved_query: z
        .string()
        .min(1)
        .max(256)
        .regex(/^[^/]+$/, 'saved_query cannot contain "/"'),
      ...commonInputShape(),
    })
    .refine(hasExactlyOneTarget, { message: EXACTLY_ONE_TARGET_MESSAGE })
);

export const runQueryOutputSchema = lazySchema(() =>
  z.object({
    ...queryResultShape(),
    error_code: z.enum(OutputErrorCode).optional(),
    action_id: z.string().optional(),
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
    defaultMessage: 'Run an osquery saved query on a set of agents and wait for the results.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: runQueryInputSchema,
  outputSchema: runQueryOutputSchema,
  documentation: {
    details: i18n.translate('xpack.osquery.workflows.steps.runQuery.documentation.details', {
      defaultMessage:
        "Finds the saved query named `saved_query` in the current space and runs it on the targets, waiting up to `wait_timeout` (default 5m, maximum 30m). Set exactly one of `agent_ids`, `agent_policy_ids` or `agent_platforms` (`linux`, `darwin` or `windows`, as on saved queries). Returns at most `max_rows` rows (default 1000); `row_count` is the total and `truncated` tells whether rows were cut. Row values are strings: use `| plus: 0` to compare them as numbers.\n\nOnce the query is dispatched the step does not fail on the query itself: the outcome is returned in `status` (`success`, `partial`, `failed` or `timed_out`) and every row carries the host it came from in `agent`. The one exception is the engine's step output limit: the rows can take up to 8MB, so do not set `max-step-size` below 8mb on this step or its workflow. `error_code` is set when the run could not read everything it should have: `DISPATCH_UNCONFIRMED`, `ACTION_NOT_VISIBLE` and `STATUS_UNREADABLE_FORBIDDEN` come with `status: failed`, while `RESULTS_UNREADABLE` comes with the real `status` and means `rows` is cut short because the rows could not be read before `wait_timeout` ended, so check `error_code` as well as `status`. A dispatched query cannot be retracted: cancelling the workflow stops the wait, not the query on the agents. The dispatch is not idempotent, so a step-level `timeout` or `on-failure.retry` that re-runs the step dispatches the query again: do not retry this step.",
    }),
    examples: [
      `## Run a saved query on one agent
\`\`\`yaml
- name: procs
  type: osquery.runQuery
  with:
    saved_query: suspicious_processes_linux_elastic
    agent_ids: ["{{ event.alerts[0].agent.id }}"]
    wait_timeout: 5m
    max_rows: 100
- name: report
  type: console
  with:
    message: "{{ steps.procs.output.status }}: {{ steps.procs.output.row_count }} rows, first pid {{ steps.procs.output.rows[0].columns.pid }}"
\`\`\``,
    ],
  },
};
