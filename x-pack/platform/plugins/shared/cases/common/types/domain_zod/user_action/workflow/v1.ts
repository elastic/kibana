/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES } from '../../../../workflows/execution_context';
import { UserActionTypes } from '../action/v1';

export const WorkflowPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  executionId: z.string(),
});

export const WorkflowOriginSchema = z.object({
  type: z.enum(CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES),
  id: z.string(),
  index: z.string().optional(),
  typeKey: z.string().optional(),
  value: z.string().optional(),
});

export const WorkflowUserActionPayloadSchema = z.object({
  workflow: WorkflowPayloadSchema,
  origin: WorkflowOriginSchema,
});

export const WorkflowUserActionSchema = z.object({
  type: z.literal(UserActionTypes.workflow),
  payload: WorkflowUserActionPayloadSchema,
});

export type WorkflowPayload = z.infer<typeof WorkflowPayloadSchema>;
export type WorkflowOrigin = z.infer<typeof WorkflowOriginSchema>;
