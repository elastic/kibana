/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseTitle } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const SetTitleStepTypeId = 'cases.setTitle';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  title: CaseTitle.min(1, 'title is required'),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetTitleStepInputSchema = typeof InputSchema;
type SetTitleStepOutputSchema = typeof OutputSchema;

export type SetTitleStepInput = z.infer<typeof InputSchema>;

export const setTitleStepCommonDefinition: CommonStepDefinition<
  SetTitleStepInputSchema,
  SetTitleStepOutputSchema
> = {
  id: SetTitleStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.SET_TITLE_STEP_LABEL,
  description: i18n.SET_TITLE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_TITLE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case title
\`\`\`yaml
- name: set_case_title
  type: ${SetTitleStepTypeId}
  with:
    case_id: "abc-123-def-456"
    title: "Updated incident title"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
