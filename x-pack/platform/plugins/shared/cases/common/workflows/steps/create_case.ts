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
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const CreateCaseStepTypeId = 'cases.createCase';

// `tags`, `settings`, `connector` are optional in step definitions.
// They will be filled in with default values if not provided.
// `connector` is omitted because step definitions have a custom connector selector.
export const InputSchema = CreateCaseRequestSchema.partial({
  tags: true,
  settings: true,
}).omit({ connector: true });

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

// `connector-id` is what's triggering the connector selector.
export const ConfigSchema = CasesStepBaseConfigSchema.extend({
  'connector-id': z.string().optional(),
});

export type CreateCaseStepInputSchema = typeof InputSchema;
export type CreateCaseStepOutputSchema = typeof OutputSchema;
export type CreateCaseStepConfigSchema = typeof ConfigSchema;

export type CreateCaseStepInput = z.infer<typeof InputSchema>;
export type CreateCaseStepOutput = z.infer<typeof OutputSchema>;
export type CreateCaseStepConfig = z.infer<typeof ConfigSchema>;

export const createCaseStepCommonDefinition: CommonStepDefinition<
  CreateCaseStepInputSchema,
  CreateCaseStepOutputSchema
> = {
  id: CreateCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
