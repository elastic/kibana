/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import {
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../domain/user_action/workflow/constants';

export const WorkflowPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  executionId: z.string(),
});

export const WorkflowOriginSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(CASE_WORKFLOW_ORIGIN_TYPE),
    id: z.string(),
  }),
  z.object({
    type: z.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
    id: z.string(),
    typeKey: z.string().optional(),
    value: z.string().optional(),
  }),
  z.object({
    type: z.literal(OBSERVABLES_WORKFLOW_ORIGIN_TYPE),
    id: z.string(),
    count: z.number().optional(),
  }),
  z.object({
    type: z.literal(ATTACHMENT_WORKFLOW_ORIGIN_TYPE),
    id: z.string(),
    attachmentType: z.string(),
    index: z.string().optional(),
  }),
  z.object({
    type: z.literal(ATTACHMENTS_WORKFLOW_ORIGIN_TYPE),
    id: z.string(),
    attachmentType: z.string(),
    count: z.number().optional(),
  }),
]);

export const WorkflowUserActionPayloadSchema = z.object({
  workflow: WorkflowPayloadSchema,
  origin: WorkflowOriginSchema.optional(),
});

export const WorkflowUserActionSchema = z.object({
  type: z.literal(UserActionTypes.workflow),
  payload: WorkflowUserActionPayloadSchema,
});
