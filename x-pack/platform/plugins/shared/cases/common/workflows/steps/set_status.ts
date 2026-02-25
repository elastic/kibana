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
  CaseStatus,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const SetStatusStepTypeId = 'cases.setStatus';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  status: CaseStatus,
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type SetStatusStepInputSchema = typeof InputSchema;
export type SetStatusStepOutputSchema = typeof OutputSchema;

export type SetStatusStepInput = z.infer<typeof InputSchema>;
export type SetStatusStepOutput = z.infer<typeof OutputSchema>;

export const setStatusStepCommonDefinition: CommonStepDefinition<
  SetStatusStepInputSchema,
  SetStatusStepOutputSchema
> = {
  id: SetStatusStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
