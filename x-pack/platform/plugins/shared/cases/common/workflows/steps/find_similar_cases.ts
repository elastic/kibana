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
import { MAX_CASES_PER_PAGE } from '../../constants';

export const FindSimilarCasesStepTypeId = 'cases.findSimilarCases';

const SimilaritySchema = z.object({
  typeKey: z.string(),
  typeLabel: z.string(),
  value: z.string(),
});

const SimilarCaseSchema = CaseResponsePropertiesSchema.extend({
  similarities: z.object({
    observables: z.array(SimilaritySchema),
  }),
});

const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  page: z.number().int().positive().optional().default(1),
  perPage: z.number().int().positive().max(MAX_CASES_PER_PAGE).optional().default(20),
});

const OutputSchema = z.object({
  cases: z.array(SimilarCaseSchema).max(MAX_CASES_PER_PAGE),
  page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int(),
});

type FindSimilarCasesStepInputSchema = typeof InputSchema;
type FindSimilarCasesStepOutputSchema = typeof OutputSchema;

export const findSimilarCasesStepCommonDefinition: CommonStepDefinition<
  FindSimilarCasesStepInputSchema,
  FindSimilarCasesStepOutputSchema
> = {
  id: FindSimilarCasesStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.FIND_SIMILAR_CASES_STEP_LABEL,
  description: i18n.FIND_SIMILAR_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.FIND_SIMILAR_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Find similar cases
\`\`\`yaml
- name: find_similar_cases
  type: ${FindSimilarCasesStepTypeId}
  with:
    case_id: "abc-123-def-456"
    page: 1
    perPage: 20
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
