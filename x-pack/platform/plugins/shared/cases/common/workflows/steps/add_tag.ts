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
  CaseTags,
} from '../../bundled-types.gen';
import * as i18n from '../translations';
import { CasesStepBaseConfigSchema, CasesStepCaseIdVersionSchema } from './shared';

export const AddTagStepTypeId = 'cases.addTag';

export const InputSchema = CasesStepCaseIdVersionSchema.extend({
  tags: CaseTags,
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type AddTagStepInputSchema = typeof InputSchema;
export type AddTagStepOutputSchema = typeof OutputSchema;

export type AddTagStepInput = z.infer<typeof InputSchema>;
export type AddTagStepOutput = z.infer<typeof OutputSchema>;

export const addTagStepCommonDefinition: CommonStepDefinition<
  AddTagStepInputSchema,
  AddTagStepOutputSchema
> = {
  id: AddTagStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.ADD_TAG_STEP_LABEL,
  description: i18n.ADD_TAG_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_TAG_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case tags
\`\`\`yaml
- name: set_case_tags
  type: ${AddTagStepTypeId}
  with:
    case_id: "abc-123-def-456"
    tags: ["investigation", "high-priority"]
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
