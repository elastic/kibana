/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import { AttachmentPayloadSchema, AttachmentPayloadWithoutRefsSchema } from '../../attachment/v1';
import { UnifiedAttachmentPayloadSchema } from '../../attachment/v2';

/** Set on the user actions of thread replies, so the feed can leave them out. */
const CommentUserActionThreadSchema = lazySchema(() =>
  z.object({ parent_id: z.string().nullable() }).partial()
);

/**
 * Stored user actions are decoded on read, so they use the shape-only payload schemas.
 * Request bounds are enforced at ingress by the api schemas.
 */
export const CommentUserActionPayloadSchema = lazySchema(() =>
  z.object({
    comment: z
      .union([AttachmentPayloadSchema, UnifiedAttachmentPayloadSchema])
      .and(CommentUserActionThreadSchema),
  })
);

export const CommentUserActionPayloadWithoutIdsSchema = lazySchema(() =>
  z.object({
    comment: z
      .union([AttachmentPayloadWithoutRefsSchema, UnifiedAttachmentPayloadSchema])
      .and(CommentUserActionThreadSchema),
  })
);

export const CommentUserActionSchema = z.object({
  type: z.literal(UserActionTypes.comment),
  payload: CommentUserActionPayloadSchema,
});

export const CommentUserActionWithoutIdsSchema = z.object({
  type: z.literal(UserActionTypes.comment),
  payload: CommentUserActionPayloadWithoutIdsSchema,
});
