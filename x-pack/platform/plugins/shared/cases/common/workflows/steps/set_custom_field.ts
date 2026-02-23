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

export const SetCustomFieldStepTypeId = 'cases.setCustomField';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  field_name: z.string().min(1, 'field_name is required'),
  value: z.union([z.string().min(1), z.boolean(), z.number().int(), z.null()]),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type SetCustomFieldStepInputSchema = typeof InputSchema;
export type SetCustomFieldStepOutputSchema = typeof OutputSchema;

export type SetCustomFieldStepInput = z.infer<typeof InputSchema>;
export type SetCustomFieldStepOutput = z.infer<typeof OutputSchema>;

export const setCustomFieldStepCommonDefinition: CommonStepDefinition<
  SetCustomFieldStepInputSchema,
  SetCustomFieldStepOutputSchema
> = {
  id: SetCustomFieldStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
