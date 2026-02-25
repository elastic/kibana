/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  CaseCategory,
  CaseResponseProperties as CaseResponsePropertiesSchema,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const AddCategoryStepTypeId = 'cases.addCategory';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  category: CaseCategory.min(1, 'category is required'),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type AddCategoryStepInputSchema = typeof InputSchema;
export type AddCategoryStepOutputSchema = typeof OutputSchema;

export type AddCategoryStepInput = z.infer<typeof InputSchema>;
export type AddCategoryStepOutput = z.infer<typeof OutputSchema>;

export const addCategoryStepCommonDefinition: CommonStepDefinition<
  AddCategoryStepInputSchema,
  AddCategoryStepOutputSchema
> = {
  id: AddCategoryStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
