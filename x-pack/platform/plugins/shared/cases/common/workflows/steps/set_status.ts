/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
import { CaseStatus } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const SetStatusStepTypeId = 'cases.setStatus';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  status: CaseStatus.optional(),
  status_key: z
    .string()
    .optional()
    .describe(
      'Key of a configured status. Takes precedence over `status`; use it to move a case to an admin-defined status such as one that pauses time tracking.'
    ),
  pause_reason: z
    .string()
    .optional()
    .describe(
      'Required when the target status pauses time tracking: one of the pause reasons configured in Case settings.'
    ),
}).refine((input) => input.status != null || input.status_key != null, {
  message: 'status or status_key is required',
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetStatusStepInputSchema = typeof InputSchema;
type SetStatusStepOutputSchema = typeof OutputSchema;

export type SetStatusStepInput = z.infer<typeof InputSchema>;

export const setStatusStepCommonDefinition: CommonStepDefinition<
  SetStatusStepInputSchema,
  SetStatusStepOutputSchema
> = {
  id: SetStatusStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.SET_STATUS_STEP_LABEL,
  description: i18n.SET_STATUS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_STATUS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case status
\`\`\`yaml
- name: set_case_status
  type: ${SetStatusStepTypeId}
  with:
    case_id: "abc-123-def-456"
    status: "in-progress"
\`\`\``,
      `## Move a case to a configured status that pauses time tracking
\`\`\`yaml
- name: put_case_on_hold
  type: ${SetStatusStepTypeId}
  with:
    case_id: "abc-123-def-456"
    status_key: "on_hold"
    pause_reason: "Awaiting vendor"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
