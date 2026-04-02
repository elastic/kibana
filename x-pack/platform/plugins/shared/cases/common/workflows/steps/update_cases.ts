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
  CaseResponseProperties as CaseResponsePropertiesSchema,
  UpdateCaseRequest as UpdateCaseRequestSchema,
} from '../../bundled-types.gen';
import { MAX_CASES_TO_UPDATE } from '../../constants';
import { CasesStepBaseConfigSchema, CasesStepCaseIdVersionSchema } from './shared';
import * as i18n from '../translations';

export const UpdateCasesStepTypeId = 'cases.updateCases';

const UpdateFieldsSchema = UpdateCaseRequestSchema.shape.cases.element.omit({
  id: true,
  version: true,
});

const CaseUpdateSchema = CasesStepCaseIdVersionSchema.extend({
  updates: UpdateFieldsSchema.refine((updates) => Object.keys(updates).length > 0, {
    message: 'updates must include at least one field',
  }),
});

export const InputSchema = z.object({
  cases: z.array(CaseUpdateSchema).min(1).max(MAX_CASES_TO_UPDATE),
});

export const OutputSchema = z.object({
  cases: z.array(CaseResponsePropertiesSchema).max(MAX_CASES_TO_UPDATE),
});

type UpdateCasesStepInputSchema = typeof InputSchema;
type UpdateCasesStepOutputSchema = typeof OutputSchema;

export const updateCasesStepCommonDefinition: CommonStepDefinition<
  UpdateCasesStepInputSchema,
  UpdateCasesStepOutputSchema
> = {
  id: UpdateCasesStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.UPDATE_CASES_STEP_LABEL,
  description: i18n.UPDATE_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.UPDATE_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Update multiple cases
\`\`\`yaml
- name: update_cases
  type: ${UpdateCasesStepTypeId}
  with:
    cases:
      - case_id: "abc-123-def-456"
        updates:
          status: "in-progress"
      - case_id: "ghi-789-jkl-012"
        updates:
          severity: "high"
\`\`\``,
      `## Update multiple cases with optional versions
\`\`\`yaml
- name: update_cases_with_versions
  type: ${UpdateCasesStepTypeId}
  with:
    cases:
      - case_id: "abc-123-def-456"
        version: "WzQ3LDFd"
        updates:
          title: "Use provided version"
      - case_id: "ghi-789-jkl-012"
        updates:
          title: "Resolve version automatically"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
