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

export const CloseCaseStepTypeId = 'cases.closeCase';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type CloseCaseStepInputSchema = typeof InputSchema;
export type CloseCaseStepOutputSchema = typeof OutputSchema;

export type CloseCaseStepInput = z.infer<typeof InputSchema>;
export type CloseCaseStepOutput = z.infer<typeof OutputSchema>;

export const closeCaseStepCommonDefinition: CommonStepDefinition<
  CloseCaseStepInputSchema,
  CloseCaseStepOutputSchema
> = {
  id: CloseCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
