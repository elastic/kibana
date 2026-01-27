/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseIdSchema, CaseResponseSchema } from '../schemas/case_workflow_schemas';

/**
 * Step type ID for getting a case by ID.
 * Follows namespaced format: 'cases.getCaseById'
 */
export const GetCaseByIdStepTypeId = 'cases.getCaseById';

/**
 * Input schema for the getCaseById step.
 * Defines the parameters required to retrieve a case.
 */
export const InputSchema = z.object({
  case_id: CaseIdSchema,
  include_comments: z.boolean().optional().default(false),
});

/**
 * Output schema for the getCaseById step.
 * Returns the complete case object.
 */
export const OutputSchema = z.object({
  case: CaseResponseSchema,
});

/**
 * Config schema for the getCaseById step.
 * Allows step-level configuration outside the 'with' block.
 */
export const ConfigSchema = z.object({
  id: z.string(),
});

export type GetCaseByIdStepInputSchema = typeof InputSchema;
export type GetCaseByIdStepOutputSchema = typeof OutputSchema;
export type GetCaseByIdStepConfigSchema = typeof ConfigSchema;

export type GetCaseByIdStepInput = z.infer<typeof InputSchema>;
export type GetCaseByIdStepOutput = z.infer<typeof OutputSchema>;
export type GetCaseByIdStepConfig = z.infer<typeof ConfigSchema>;

/**
 * Common step definition for getCaseById, shared between server and public.
 */
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
