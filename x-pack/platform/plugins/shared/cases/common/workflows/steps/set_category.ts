/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseCategory } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const SetCategoryStepTypeId = 'cases.setCategory';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  category: CaseCategory.min(1, 'category is required'),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetCategoryStepInputSchema = typeof InputSchema;
type SetCategoryStepOutputSchema = typeof OutputSchema;

export type SetCategoryStepInput = z.infer<typeof InputSchema>;

export const setCategoryStepCommonDefinition: CommonStepDefinition<
  SetCategoryStepInputSchema,
  SetCategoryStepOutputSchema
> = {
  id: SetCategoryStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.ADD_CATEGORY_STEP_LABEL,
  description: i18n.ADD_CATEGORY_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_CATEGORY_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case category
\`\`\`yaml
- name: set_case_category
  type: ${SetCategoryStepTypeId}
  with:
    case_id: "abc-123-def-456"
    category: "Malware"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
