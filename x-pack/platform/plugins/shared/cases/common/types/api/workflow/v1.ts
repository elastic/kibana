/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CASE_WORKFLOW_RUN_ORIGIN_TYPES } from '../../domain/user_action/workflow/constants';

export const CASES_WORKFLOW_EXECUTION_SOURCE = 'cases' as const;
export const CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION = 1 as const;
export const MAX_CASE_WORKFLOW_RUN_ID_LENGTH = 1024;

export const CaseWorkflowRunOriginSchema = z
  .object({
    type: z.enum(CASE_WORKFLOW_RUN_ORIGIN_TYPES),
    id: z.string().min(1).max(MAX_CASE_WORKFLOW_RUN_ID_LENGTH),
  })
  .strict();

export type CaseWorkflowRunOrigin = z.infer<typeof CaseWorkflowRunOriginSchema>;

export const CasesWorkflowExecutionMetadataSchema = z
  .object({
    schemaVersion: z.literal(CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION),
    source: z.literal(CASES_WORKFLOW_EXECUTION_SOURCE),
    caseId: z.string().min(1).max(MAX_CASE_WORKFLOW_RUN_ID_LENGTH),
    origin: CaseWorkflowRunOriginSchema,
  })
  .strict();

export type CasesWorkflowExecutionMetadata = z.infer<typeof CasesWorkflowExecutionMetadataSchema>;

export interface RunCaseWorkflowRequest {
  inputs: Record<string, unknown>;
  origin: CaseWorkflowRunOrigin;
}

export interface RunCaseWorkflowResponse {
  workflowExecutionId: string;
  activityStatus: 'succeeded' | 'failed';
}
