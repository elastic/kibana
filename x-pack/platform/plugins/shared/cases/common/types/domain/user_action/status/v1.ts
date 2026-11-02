/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CaseCloseReasonSchema, CaseStatusSchema } from '../../case/v1';
import { UserActionTypes } from '../action/v1';

export const StatusUserActionPayloadSchema = z.object({
  status: CaseStatusSchema,
  closeReason: CaseCloseReasonSchema.optional(),
  syncedAlertCount: z.number().optional(),
});

export const StatusUserActionSchema = z.object({
  type: z.literal(UserActionTypes.status),
  payload: StatusUserActionPayloadSchema,
});
