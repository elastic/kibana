/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../../docs/openapi/bundled-types.gen';

export const AddCommentStepTypeId = 'cases.addComment';

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  comment: z.string().min(1, 'comment is required').max(30000),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type AddCommentStepInputSchema = typeof InputSchema;
export type AddCommentStepOutputSchema = typeof OutputSchema;

export type AddCommentStepInput = z.infer<typeof InputSchema>;
export type AddCommentStepOutput = z.infer<typeof OutputSchema>;

export const addCommentStepCommonDefinition: CommonStepDefinition<
  AddCommentStepInputSchema,
  AddCommentStepOutputSchema
> = {
  id: AddCommentStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
