/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const CloseCaseStepTypeId = 'cases.closeCase';

export const InputSchema = CasesStepCaseIdVersionSchema;

export const OutputSchema = CasesStepSingleCaseOutputSchema;

export type CloseCaseStepInputSchema = typeof InputSchema;
export type CloseCaseStepOutputSchema = typeof OutputSchema;

export type CloseCaseStepInput = z.infer<typeof InputSchema>;
export type CloseCaseStepOutput = z.infer<typeof OutputSchema>;

export const closeCaseStepCommonDefinition: CommonStepDefinition<
  CloseCaseStepInputSchema,
  CloseCaseStepOutputSchema
> = {
  id: CloseCaseStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.CLOSE_CASE_STEP_LABEL,
  description: i18n.CLOSE_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.CLOSE_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Close a case
\`\`\`yaml
- name: close_case
  type: ${CloseCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
