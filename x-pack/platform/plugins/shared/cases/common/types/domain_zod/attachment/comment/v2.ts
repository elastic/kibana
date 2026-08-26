/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { MAX_COMMENT_LENGTH } from '../../../../constants';

export const CommentAttachmentDataSchema = z
  .object({
    content: z
      .string()
      .max(
        MAX_COMMENT_LENGTH,
        `Comment content exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`
      )
      .refine((value) => value.trim().length > 0, {
        message: 'Comment content must be a non-empty string',
      }),
  })
  .strict();

export type CommentAttachmentData = z.infer<typeof CommentAttachmentDataSchema>;

export const CommentAttachmentPayloadSchema = z
  .object({
    type: z.literal(COMMENT_ATTACHMENT_TYPE),
    owner: z.string(),
    data: CommentAttachmentDataSchema,
  })
  .strict();

export type CommentAttachmentPayload = z.infer<typeof CommentAttachmentPayloadSchema>;
