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
  STEP_STATUSES,
} from '../../contract/schemas';

export const RunPackStepId = 'osquery.runPack' as const;

export const EXACTLY_ONE_PACK_MESSAGE = 'Set exactly one of pack or prebuilt_pack';

export const runPackInputSchema = lazySchema(() =>
  z
    .strictObject({
      pack: z.string().min(1).max(256).optional(),
      prebuilt_pack: z.string().min(1).max(256).optional(),
      ...commonInputShape(),
    })
    .refine((input) => (input.pack === undefined) !== (input.prebuilt_pack === undefined), {
      message: EXACTLY_ONE_PACK_MESSAGE,
    })
    .refine(hasExactlyOneTarget, { message: EXACTLY_ONE_TARGET_MESSAGE })
);

export const runPackOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(STEP_STATUSES),
    error_code: z.enum(OutputErrorCode).optional(),
    action_id: z.string().optional(),
    queries: z.array(
      z.object({
        query_id: z.string(),
        action_id: z.string(),
        ...queryResultShape(),
      })
    ),
  })
);

export type RunPackInput = z.infer<typeof runPackInputSchema>;
export type RunPackOutput = z.infer<typeof runPackOutputSchema>;

export const runPackStepCommonDefinition: BaseStepDefinition<
  typeof runPackInputSchema,
  typeof runPackOutputSchema
> = {
  id: RunPackStepId,
  label: i18n.translate('xpack.osquery.workflows.steps.runPack.label', {
    defaultMessage: 'Run Osquery Pack',
  }),
  description: i18n.translate('xpack.osquery.workflows.steps.runPack.description', {
    defaultMessage:
      'Run an osquery pack on a set of agents and wait for the results of each of its queries.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: runPackInputSchema,
  outputSchema: runPackOutputSchema,
  documentation: {
    details: i18n.translate('xpack.osquery.workflows.steps.runPack.documentation.details', {
      defaultMessage:
        'Runs the pack named `pack` in the current space or the Elastic prebuilt pack `prebuilt_pack` (its package name, for example `forensic-persistence`, or its asset id; it must be loaded in this space) on the targets, waiting up to `wait_timeout` (default 5m, maximum 30m). Set exactly one of `pack` or `prebuilt_pack`, and exactly one of `agent_ids`, `agent_policy_ids` or `agent_platforms` (`linux`, `darwin` or `windows`). Disabled pack queries are skipped, and a pack with an enabled query that has template placeholders (double curly braces) is rejected before anything is dispatched.\n\n`queries` has one entry per enabled pack query (`query_id`, `action_id`, `status`, `agents`, `rows`, `row_count`, `truncated`). `max_rows` (default 1000) applies to each query, and the rows of all queries together can take up to 8MB, so do not set `max-step-size` below 8mb on this step or its workflow. The overall `status` is `success` when every query succeeded, `timed_out` when no query got a response, `failed` when no query succeeded and `partial` otherwise.\n\nOnce the pack is dispatched the step does not fail on the queries themselves. `error_code` is set when the run could not read everything it should have: `DISPATCH_UNCONFIRMED`, `ACTION_NOT_VISIBLE` and `STATUS_UNREADABLE_FORBIDDEN` come with `status: failed`, while `RESULTS_UNREADABLE` comes with the real `status` and means the rows of at least one query are cut short because they could not be read before `wait_timeout` ended, so check `error_code` as well as `status`. A dispatched pack cannot be retracted: cancelling the workflow stops the wait, not the queries on the agents. The dispatch is not idempotent, so a step-level `timeout` or `on-failure.retry` that re-runs the step dispatches the pack again: do not retry this step.',
    }),
    examples: [
      `## Run a prebuilt pack on one agent
\`\`\`yaml
- name: persistence
  type: osquery.runPack
  with:
    prebuilt_pack: forensic-persistence
    agent_ids: ["{{ event.alerts[0].agent.id }}"]
    wait_timeout: 10m
    max_rows: 200
- name: report
  type: console
  with:
    message: "{{ steps.persistence.output.status }}: {{ steps.persistence.output.queries | size }} queries"
\`\`\``,
    ],
  },
};
