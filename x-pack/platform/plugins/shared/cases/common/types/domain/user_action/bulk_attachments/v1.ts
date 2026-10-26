/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

export const BulkAttachmentsPayloadSchema = z.object({
  /** The unified attachment type, e.g. `security.alert` or `file`. */
  attachmentType: z.string(),
  /**
   * The removed items, e.g. alerts or files, counted once each. An attachment that references
   * nothing counts as 1 item.
   */
  count: z.number(),
});

export const BulkAttachmentsUserActionPayloadSchema = z.object({
  bulkAttachments: BulkAttachmentsPayloadSchema,
});

export const BulkAttachmentsUserActionSchema = z.object({
  type: z.literal(UserActionTypes.bulkAttachments),
  payload: BulkAttachmentsUserActionPayloadSchema,
});

export type BulkAttachmentsPayload = z.infer<typeof BulkAttachmentsPayloadSchema>;
