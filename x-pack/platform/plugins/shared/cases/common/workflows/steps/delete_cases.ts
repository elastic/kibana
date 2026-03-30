/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import { MAX_DELETE_IDS_LENGTH } from '../../constants';

export const DeleteCasesStepTypeId = 'cases.deleteCases';

const CaseIdsSchema = z
  .array(z.string().min(1, 'case_ids values are required'))
  .min(1)
  .max(MAX_DELETE_IDS_LENGTH);

const InputSchema = z.object({
  case_ids: CaseIdsSchema,
});

const OutputSchema = z.object({
  case_ids: CaseIdsSchema,
});

type DeleteCasesStepInputSchema = typeof InputSchema;
type DeleteCasesStepOutputSchema = typeof OutputSchema;

export const deleteCasesStepCommonDefinition: CommonStepDefinition<
  DeleteCasesStepInputSchema,
  DeleteCasesStepOutputSchema
> = {
  id: DeleteCasesStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.DELETE_CASES_STEP_LABEL,
  description: i18n.DELETE_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.DELETE_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Delete multiple cases
\`\`\`yaml
- name: delete_cases
  type: ${DeleteCasesStepTypeId}
  with:
    case_ids:
      - "abc-123-def-456"
      - "ghi-789-jkl-012"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
