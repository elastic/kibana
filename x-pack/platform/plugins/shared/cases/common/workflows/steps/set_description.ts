/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseDescription } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const SetDescriptionStepTypeId = 'cases.setDescription';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  description: CaseDescription.min(1, 'description is required'),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetDescriptionStepInputSchema = typeof InputSchema;
type SetDescriptionStepOutputSchema = typeof OutputSchema;

export type SetDescriptionStepInput = z.infer<typeof InputSchema>;

export const setDescriptionStepCommonDefinition: CommonStepDefinition<
  SetDescriptionStepInputSchema,
  SetDescriptionStepOutputSchema
> = {
  id: SetDescriptionStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.SET_DESCRIPTION_STEP_LABEL,
  description: i18n.SET_DESCRIPTION_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_DESCRIPTION_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case description
\`\`\`yaml
- name: set_case_description
  type: ${SetDescriptionStepTypeId}
  with:
    case_id: "abc-123-def-456"
    description: "Updated timeline and investigation findings."
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
