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
  CaseTitle,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const SetTitleStepTypeId = 'cases.setTitle';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  title: CaseTitle.min(1, 'title is required'),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type SetTitleStepInputSchema = typeof InputSchema;
export type SetTitleStepOutputSchema = typeof OutputSchema;

export type SetTitleStepInput = z.infer<typeof InputSchema>;
export type SetTitleStepOutput = z.infer<typeof OutputSchema>;

export const setTitleStepCommonDefinition: CommonStepDefinition<
  SetTitleStepInputSchema,
  SetTitleStepOutputSchema
> = {
  id: SetTitleStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
