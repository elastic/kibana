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

export const UnassignCaseStepTypeId = 'cases.unassignCase';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  assignees: Assignees,
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type UnassignCaseStepInputSchema = typeof InputSchema;
type UnassignCaseStepOutputSchema = typeof OutputSchema;

export type UnassignCaseStepInput = z.infer<typeof InputSchema>;

export const unassignCaseStepCommonDefinition: CommonStepDefinition<
  UnassignCaseStepInputSchema,
  UnassignCaseStepOutputSchema
> = {
  id: UnassignCaseStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.UNASSIGN_CASE_STEP_LABEL,
  description: i18n.UNASSIGN_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.UNASSIGN_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Unassign specific users from a case
\`\`\`yaml
- name: unassign_case_users
  type: ${UnassignCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    assignees:
      - uid: "user-123"
\`\`\``,
      `## Unassign everyone from a case
\`\`\`yaml
- name: unassign_all_case_users
  type: ${UnassignCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    assignees: null
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
