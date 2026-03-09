/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  Assignees,
  CaseResponseProperties as CaseResponsePropertiesSchema,
} from '../../bundled-types.gen';
import * as i18n from '../translations';
import { CasesStepBaseConfigSchema, CasesStepCaseIdVersionSchema } from './shared';

export const UnassignCaseStepTypeId = 'cases.unassignCase';

export const InputSchema = CasesStepCaseIdVersionSchema.extend({
  assignees: Assignees,
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type UnassignCaseStepInputSchema = typeof InputSchema;
export type UnassignCaseStepOutputSchema = typeof OutputSchema;

export type UnassignCaseStepInput = z.infer<typeof InputSchema>;
export type UnassignCaseStepOutput = z.infer<typeof OutputSchema>;

export const unassignCaseStepCommonDefinition: CommonStepDefinition<
  UnassignCaseStepInputSchema,
  UnassignCaseStepOutputSchema
> = {
  id: UnassignCaseStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.UNASSIGN_CASE_STEP_LABEL,
  description: i18n.UNASSIGN_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.UNASSIGN_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set assignees after unassignment
\`\`\`yaml
- name: unassign_case_users
  type: ${UnassignCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    assignees: []
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
