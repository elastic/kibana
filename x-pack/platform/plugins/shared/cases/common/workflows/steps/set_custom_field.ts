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
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import * as i18n from '../translations';

export const SetCustomFieldStepTypeId = 'cases.setCustomField';

export const InputSchema = CasesStepCaseIdVersionSchema.extend({
  field_name: z.string().min(1, 'field_name is required'),
  value: z.union([z.string().min(1), z.boolean(), z.number().int(), z.null()]),
});

export const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetCustomFieldStepInputSchema = typeof InputSchema;
type SetCustomFieldStepOutputSchema = typeof OutputSchema;

export type SetCustomFieldStepInput = z.infer<typeof InputSchema>;

export const setCustomFieldStepCommonDefinition: CommonStepDefinition<
  SetCustomFieldStepInputSchema,
  SetCustomFieldStepOutputSchema
> = {
  id: SetCustomFieldStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.SET_CUSTOM_FIELD_STEP_LABEL,
  description: i18n.SET_CUSTOM_FIELD_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_CUSTOM_FIELD_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set text custom field
\`\`\`yaml
- name: set_text_custom_field
  type: ${SetCustomFieldStepTypeId}
  with:
    case_id: "abc-123-def-456"
    field_name: "priority_reason"
    value: "investigate immediately"
\`\`\``,
      `## Set toggle custom field
\`\`\`yaml
- name: set_toggle_custom_field
  type: ${SetCustomFieldStepTypeId}
  with:
    case_id: "abc-123-def-456"
    field_name: "is_automated"
    value: true
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
