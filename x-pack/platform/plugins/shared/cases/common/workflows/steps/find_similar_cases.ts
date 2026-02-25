/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../bundled-types.gen';

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

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  page: z.number().int().positive().optional().default(1),
  perPage: z.number().int().positive().max(100).optional().default(20),
});

export const OutputSchema = z.object({
  cases: z.array(SimilarCaseSchema).max(100),
  page: z.number().int(),
  per_page: z.number().int(),
  total: z.number().int(),
});

export type FindSimilarCasesStepInputSchema = typeof InputSchema;
export type FindSimilarCasesStepOutputSchema = typeof OutputSchema;

export type FindSimilarCasesStepInput = z.infer<typeof InputSchema>;
export type FindSimilarCasesStepOutput = z.infer<typeof OutputSchema>;

export const findSimilarCasesStepCommonDefinition: CommonStepDefinition<
  FindSimilarCasesStepInputSchema,
  FindSimilarCasesStepOutputSchema
> = {
  id: FindSimilarCasesStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
