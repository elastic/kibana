/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties } from '../../../docs/openapi/bundled-types.gen';

export const GetCaseByIdStepTypeId = 'cases.getCaseById';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  include_comments: z.boolean().optional().default(false),
});

export const OutputSchema = z.object({
  case: CaseResponseProperties,
});

export const ConfigSchema = z.object({
  id: z.string(),
});

export type GetCaseByIdStepInputSchema = typeof InputSchema;
export type GetCaseByIdStepOutputSchema = typeof OutputSchema;
export type GetCaseByIdStepConfigSchema = typeof ConfigSchema;

export type GetCaseByIdStepInput = z.infer<typeof InputSchema>;
export type GetCaseByIdStepOutput = z.infer<typeof OutputSchema>;
export type GetCaseByIdStepConfig = z.infer<typeof ConfigSchema>;

export const getCaseByIdStepCommonDefinition: CommonStepDefinition<
  GetCaseByIdStepInputSchema,
  GetCaseByIdStepOutputSchema,
  GetCaseByIdStepConfigSchema
> = {
  id: GetCaseByIdStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
