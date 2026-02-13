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
  CreateCaseRequest as CreateCaseRequestSchema,
} from '../../../docs/openapi/bundled-types.gen';

export const CreateCaseStepTypeId = 'cases.createCase';

export const InputSchema = CreateCaseRequestSchema;

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export const ConfigSchema = z.object({
  id: z.string(),
});

export type CreateCaseStepInputSchema = typeof InputSchema;
export type CreateCaseStepOutputSchema = typeof OutputSchema;
export type CreateCaseStepConfigSchema = typeof ConfigSchema;

export type CreateCaseStepInput = z.infer<typeof InputSchema>;
export type CreateCaseStepOutput = z.infer<typeof OutputSchema>;
export type CreateCaseStepConfig = z.infer<typeof ConfigSchema>;

export const createCaseStepCommonDefinition: CommonStepDefinition<
  CreateCaseStepInputSchema,
  CreateCaseStepOutputSchema,
  CreateCaseStepConfigSchema
> = {
  id: CreateCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
