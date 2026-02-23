/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  CaseResponseProperties as CaseResponsePropertiesSchema,
  UpdateCaseRequest as UpdateCaseRequestSchema,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const UpdateCasesStepTypeId = 'cases.updateCases';

const UpdateFieldsSchema = UpdateCaseRequestSchema.shape.cases.element.omit({
  id: true,
  version: true,
});

const CaseUpdateSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  updates: UpdateFieldsSchema.refine((updates) => Object.keys(updates).length > 0, {
    message: 'updates must include at least one field',
  }),
});

export const InputSchema = z.object({
  cases: z.array(CaseUpdateSchema).min(1).max(100),
});

export const OutputSchema = z.object({
  cases: z.array(CaseResponsePropertiesSchema).max(100),
});

export type UpdateCasesStepInputSchema = typeof InputSchema;
export type UpdateCasesStepOutputSchema = typeof OutputSchema;

export type UpdateCasesStepInput = z.infer<typeof InputSchema>;
export type UpdateCasesStepOutput = z.infer<typeof OutputSchema>;

export const updateCasesStepCommonDefinition: CommonStepDefinition<
  UpdateCasesStepInputSchema,
  UpdateCasesStepOutputSchema
> = {
  id: UpdateCasesStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
