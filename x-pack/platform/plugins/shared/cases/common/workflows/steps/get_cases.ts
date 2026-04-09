/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../bundled-types.gen';
import * as i18n from '../translations';
import { MAX_BULK_GET_CASES } from '../../constants';

export const GetCasesStepTypeId = 'cases.getCases';

const InputSchema = z.object({
  case_ids: z
    .array(z.string().min(1))
    .min(1, 'at least one case_id is required')
    .max(MAX_BULK_GET_CASES),
});

const BulkGetErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  status: z.number().int().optional(),
  caseId: z.string(),
});

const OutputSchema = z.object({
  cases: z.array(CaseResponsePropertiesSchema).max(MAX_BULK_GET_CASES),
  errors: z.array(BulkGetErrorSchema),
});

type GetCasesStepInputSchema = typeof InputSchema;
type GetCasesStepOutputSchema = typeof OutputSchema;

export type GetCasesStepInput = z.infer<typeof InputSchema>;

export const getCasesStepCommonDefinition: CommonStepDefinition<
  GetCasesStepInputSchema,
  GetCasesStepOutputSchema
> = {
  id: GetCasesStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.GET_CASES_STEP_LABEL,
  description: i18n.GET_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.GET_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Batch-retrieve multiple cases
\`\`\`yaml
- name: get_cases
  type: ${GetCasesStepTypeId}
  with:
    case_ids:
      - "abc-123-def-456"
      - "bcd-234-efg-567"
\`\`\``,
      `## Fan-out: find related cases then retrieve them all at once
\`\`\`yaml
- name: find_by_alert
  type: cases.getCasesByAlertId
  with:
    alert_id: \${{ trigger.alert.id }}

- name: get_all_related_cases
  type: ${GetCasesStepTypeId}
  with:
    case_ids: \${{ steps.find_by_alert.output.cases.map(c => c.id) }}
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
