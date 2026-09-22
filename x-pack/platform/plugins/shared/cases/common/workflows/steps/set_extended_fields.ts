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

export const SetExtendedFieldsStepTypeId = 'cases.setExtendedFields';

export const InputSchema = CasesStepCaseIdVersionSchema.extend({
  /**
   * Map of extended-field storage key (`<name>_as_<type>`) to value. Values are strings in the
   * canonical storage format; multi-value controls take a JSON-encoded array string. Merged into
   * the case's existing `extended_fields` — unlisted keys are left untouched. No `owner` input:
   * the write authorizes against the case's real owner.
   *
   * An empty string value is a valid, explicit "clear this field" — `validateExtendedFields`
   * treats `''` as empty and only rejects it when the field is required. It is intentionally not
   * bounded with `.min(1)`.
   */
  fields: z.record(z.string().min(1), z.string()),
});

export const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetExtendedFieldsStepInputSchema = typeof InputSchema;
type SetExtendedFieldsStepOutputSchema = typeof OutputSchema;

export type SetExtendedFieldsStepInput = z.infer<typeof InputSchema>;

export const setExtendedFieldsStepCommonDefinition: CommonStepDefinition<
  SetExtendedFieldsStepInputSchema,
  SetExtendedFieldsStepOutputSchema
> = {
  id: SetExtendedFieldsStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.SET_EXTENDED_FIELDS_STEP_LABEL,
  description: i18n.SET_EXTENDED_FIELDS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_EXTENDED_FIELDS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set extended fields
\`\`\`yaml
- name: set_extended_fields
  type: ${SetExtendedFieldsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    fields:
      priority_as_keyword: "high"
      analyst_notes_as_keyword: "escalated by automation"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
