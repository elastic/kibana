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

export const runPackInputSchema = lazySchema(() =>
  z
    .strictObject({
      pack_id: z.string().min(1).max(256).optional(),
      prebuilt_pack: z.string().min(1).max(256).optional(),
      ...commonInputShape(),
    })
    .refine((input) => (input.pack_id === undefined) !== (input.prebuilt_pack === undefined), {
      message: 'Set exactly one of pack_id or prebuilt_pack',
    })
    .refine(hasExactlyOneTarget, { message: EXACTLY_ONE_TARGET_MESSAGE })
);

export const runPackOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(STEP_STATUSES),
    error_code: z.enum(Object.values(OutputErrorCode) as [string, ...string[]]).optional(),
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
      'Run an osquery pack on the given agents and wait for the answers. Once the pack is dispatched the step never fails: the outcome is returned in `status` and in one entry per pack query under `queries`.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: runPackInputSchema,
  outputSchema: runPackOutputSchema,
  documentation: {
    details: i18n.translate('xpack.osquery.workflows.steps.runPack.documentation.details', {
      defaultMessage:
        'Runs the pack `pack_id` (a pack saved-object id) or the Elastic prebuilt pack `prebuilt_pack`, by its name (for example `forensic-persistence`; it must be loaded in this space) on the targets. `max_rows` applies to each query. The overall `status` is `success` when every query succeeded, `timed_out` when no query got a response, `failed` when no query succeeded and `partial` otherwise.',
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
\`\`\``,
    ],
  },
};
