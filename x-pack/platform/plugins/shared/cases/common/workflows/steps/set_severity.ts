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
  CaseSeverity,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const SetSeverityStepTypeId = 'cases.setSeverity';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  severity: CaseSeverity,
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type SetSeverityStepInputSchema = typeof InputSchema;
export type SetSeverityStepOutputSchema = typeof OutputSchema;

export type SetSeverityStepInput = z.infer<typeof InputSchema>;
export type SetSeverityStepOutput = z.infer<typeof OutputSchema>;

export const setSeverityStepCommonDefinition: CommonStepDefinition<
  SetSeverityStepInputSchema,
  SetSeverityStepOutputSchema
> = {
  id: SetSeverityStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
