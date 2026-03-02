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

export const UpdateCaseStepTypeId = 'cases.updateCase';

const UpdateFieldsSchema = UpdateCaseRequestSchema.shape.cases.element.omit({
  id: true,
  version: true,
});

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  updates: UpdateFieldsSchema.refine((updates) => Object.keys(updates).length > 0, {
    message: 'updates must include at least one field',
  }),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type UpdateCaseStepInputSchema = typeof InputSchema;
export type UpdateCaseStepOutputSchema = typeof OutputSchema;

export type UpdateCaseStepInput = z.infer<typeof InputSchema>;
export type UpdateCaseStepOutput = z.infer<typeof OutputSchema>;

export const updateCaseStepCommonDefinition: CommonStepDefinition<
  UpdateCaseStepInputSchema,
  UpdateCaseStepOutputSchema
> = {
  id: UpdateCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
