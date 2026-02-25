/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const AddObservablesStepTypeId = 'cases.addObservables';

const ObservableInputSchema = z.object({
  typeKey: z.string().min(1, 'typeKey is required'),
  value: z.string().min(1, 'value is required'),
  description: z.string().nullable().optional(),
});

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  observables: z.array(ObservableInputSchema).min(1).max(1000),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type AddObservablesStepInputSchema = typeof InputSchema;
export type AddObservablesStepOutputSchema = typeof OutputSchema;

export type AddObservablesStepInput = z.infer<typeof InputSchema>;
export type AddObservablesStepOutput = z.infer<typeof OutputSchema>;

export const addObservablesStepCommonDefinition: CommonStepDefinition<
  AddObservablesStepInputSchema,
  AddObservablesStepOutputSchema
> = {
  id: AddObservablesStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
