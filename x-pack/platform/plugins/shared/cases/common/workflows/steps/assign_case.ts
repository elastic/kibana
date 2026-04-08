/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { Assignees } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const AssignCaseStepTypeId = 'cases.assignCase';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  assignees: Assignees,
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type AssignCaseStepInputSchema = typeof InputSchema;
type AssignCaseStepOutputSchema = typeof OutputSchema;

export type AssignCaseStepInput = z.infer<typeof InputSchema>;

export const assignCaseStepCommonDefinition: CommonStepDefinition<
  AssignCaseStepInputSchema,
  AssignCaseStepOutputSchema
> = {
  id: AssignCaseStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.ASSIGN_CASE_STEP_LABEL,
  description: i18n.ASSIGN_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ASSIGN_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Assign users to case
\`\`\`yaml
- name: assign_case_users
  type: ${AssignCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    assignees:
      - uid: "user-123"
      - uid: "user-456"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
