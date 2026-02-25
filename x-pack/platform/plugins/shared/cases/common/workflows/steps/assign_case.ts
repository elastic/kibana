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

export const AssignCaseStepTypeId = 'cases.assignCase';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
  assignees: Assignees,
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type AssignCaseStepInputSchema = typeof InputSchema;
export type AssignCaseStepOutputSchema = typeof OutputSchema;

export type AssignCaseStepInput = z.infer<typeof InputSchema>;
export type AssignCaseStepOutput = z.infer<typeof OutputSchema>;

export const assignCaseStepCommonDefinition: CommonStepDefinition<
  AssignCaseStepInputSchema,
  AssignCaseStepOutputSchema
> = {
  id: AssignCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
