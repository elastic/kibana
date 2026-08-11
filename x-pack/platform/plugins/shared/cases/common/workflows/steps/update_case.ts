/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { UpdateCaseRequest as UpdateCaseRequestSchema } from '../../bundled-types.gen';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import * as i18n from '../translations';

export const UpdateCaseStepTypeId = 'cases.updateCase';

const UpdateFieldsSchema = UpdateCaseRequestSchema.shape.cases.element.omit({
  id: true,
  version: true,
});

export const InputSchema = CasesStepCaseIdVersionSchema.extend({
  updates: UpdateFieldsSchema.refine((updates) => Object.keys(updates).length > 0, {
    message: 'updates must include at least one field',
  }),
});

export const OutputSchema = CasesStepSingleCaseOutputSchema;

type UpdateCaseStepInputSchema = typeof InputSchema;
type UpdateCaseStepOutputSchema = typeof OutputSchema;

export type UpdateCaseStepInput = z.infer<typeof InputSchema>;

export const updateCaseStepCommonDefinition: CommonStepDefinition<
  UpdateCaseStepInputSchema,
  UpdateCaseStepOutputSchema
> = {
  id: UpdateCaseStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.UPDATE_CASE_STEP_LABEL,
  description: i18n.UPDATE_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.UPDATE_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Update case status and severity
\`\`\`yaml
- name: update_case
  type: ${UpdateCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    updates:
      status: "in-progress"
      severity: "high"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
