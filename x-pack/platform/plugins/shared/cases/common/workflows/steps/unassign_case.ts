/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  Assignees,
  CaseResponseProperties as CaseResponsePropertiesSchema,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const UnassignCaseStepTypeId = 'cases.unassignCase';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  assignees: Assignees,
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type UnassignCaseStepInputSchema = typeof InputSchema;
export type UnassignCaseStepOutputSchema = typeof OutputSchema;

export type UnassignCaseStepInput = z.infer<typeof InputSchema>;
export type UnassignCaseStepOutput = z.infer<typeof OutputSchema>;

export const unassignCaseStepCommonDefinition: CommonStepDefinition<
  UnassignCaseStepInputSchema,
  UnassignCaseStepOutputSchema
> = {
  id: UnassignCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
