/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties } from '../../bundled-types.gen';

export const GetCaseStepTypeId = 'cases.getCase';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  include_comments: z.boolean().optional().default(false),
});

export const OutputSchema = z.object({
  case: CaseResponseProperties,
});

export type GetCaseStepInputSchema = typeof InputSchema;
export type GetCaseStepOutputSchema = typeof OutputSchema;

export type GetCaseStepInput = z.infer<typeof InputSchema>;
export type GetCaseStepOutput = z.infer<typeof OutputSchema>;

export const getCaseStepCommonDefinition: CommonStepDefinition<
  GetCaseStepInputSchema,
  GetCaseStepOutputSchema
> = {
  id: GetCaseStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
