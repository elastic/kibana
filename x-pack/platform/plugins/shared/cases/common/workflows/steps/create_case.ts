/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseSchema } from '../schemas/case_workflow_schemas';
import { caseApiV1 } from '../../types/api';
import type { CasePostRequest } from '../../types/api';

/**
 * Step type ID for creating a new case.
 * Follows namespaced format: 'cases.createCase'
 */
export const CreateCaseStepTypeId = 'cases.createCase';

/**
 * Input schema for the createCase step.
 *
 * Uses the CasePostRequest io-ts runtime type for validation to ensure
 * the workflow input exactly matches the Cases API contract. This provides:
 * - Single source of truth from the API definition
 * - Automatic validation against API requirements
 * - Consistency with REST API expectations
 *
 * Required fields:
 * - title: Case title (1-160 characters)
 * - description: Case description (1-30000 characters)
 * - tags: Array of tags (0-200 tags, each 1-256 characters)
 * - connector: External system connector configuration
 * - settings: Sync settings for alerts and observables
 * - owner: Plugin owner (e.g., 'securitySolution', 'observability')
 *
 * Optional fields:
 * - assignees: Users assigned to the case (0-10 users)
 * - severity: Case severity (low, medium, high, critical) - defaults to 'low'
 * - category: Case category (1-50 characters)
 * - customFields: Custom field values (0-10 fields)
 */
const ioTsToZod = <T>(label: string, isFn: (value: unknown) => value is T) =>
  z.custom<T>((value) => isFn(value), { message: `Invalid ${label} payload` });

export const InputSchema = ioTsToZod<CasePostRequest>(
  'case post request',
  caseApiV1.CasePostRequestRt.is
);

/**
 * Output schema for the createCase step.
 * Returns the complete created case object.
 */
export const OutputSchema = z.object({
  case: CaseResponseSchema,
});

/**
 * Config schema for the createCase step.
 * Allows step-level configuration outside the 'with' block.
 */
export const ConfigSchema = z.object({
  id: z.string(),
});

export type CreateCaseStepInputSchema = typeof InputSchema;
export type CreateCaseStepOutputSchema = typeof OutputSchema;
export type CreateCaseStepConfigSchema = typeof ConfigSchema;

export type CreateCaseStepInput = z.infer<typeof InputSchema>;
export type CreateCaseStepOutput = z.infer<typeof OutputSchema>;
export type CreateCaseStepConfig = z.infer<typeof ConfigSchema>;

/**
 * Common step definition for createCase, shared between server and public.
 */
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
