/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseStatus } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const SetStatusStepTypeId = 'cases.setStatus';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  status: CaseStatus,
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
  category: StepCategory.Kibana,
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
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
