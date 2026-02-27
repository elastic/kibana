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

export const CreateCaseFromTemplateStepTypeId = 'cases.createCaseFromTemplate';

export const OverwritesSchema = UpdateCaseRequestSchema.shape.cases.element.omit({
  id: true,
  version: true,
});

export const InputSchema = z.object({
  case_template_id: z.string().min(1, 'case_template_id is required'),
  overwrites: OverwritesSchema.optional(),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export const ConfigSchema = CasesStepBaseConfigSchema;

export type CreateCaseFromTemplateStepInputSchema = typeof InputSchema;
export type CreateCaseFromTemplateStepOutputSchema = typeof OutputSchema;
export type CreateCaseFromTemplateStepConfigSchema = typeof ConfigSchema;

export type CreateCaseFromTemplateStepInput = z.infer<typeof InputSchema>;
export type CreateCaseFromTemplateStepOutput = z.infer<typeof OutputSchema>;
export type CreateCaseFromTemplateStepConfig = z.infer<typeof ConfigSchema>;

export const createCaseFromTemplateStepCommonDefinition: CommonStepDefinition<
  CreateCaseFromTemplateStepInputSchema,
  CreateCaseFromTemplateStepOutputSchema
> = {
  id: CreateCaseFromTemplateStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
