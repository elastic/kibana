/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  CaseDescription,
  CaseResponseProperties as CaseResponsePropertiesSchema,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const SetDescriptionStepTypeId = 'cases.setDescription';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  description: CaseDescription.min(1, 'description is required'),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type SetDescriptionStepInputSchema = typeof InputSchema;
export type SetDescriptionStepOutputSchema = typeof OutputSchema;

export type SetDescriptionStepInput = z.infer<typeof InputSchema>;
export type SetDescriptionStepOutput = z.infer<typeof OutputSchema>;

export const setDescriptionStepCommonDefinition: CommonStepDefinition<
  SetDescriptionStepInputSchema,
  SetDescriptionStepOutputSchema
> = {
  id: SetDescriptionStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
