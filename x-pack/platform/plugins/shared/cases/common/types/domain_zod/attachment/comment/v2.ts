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

/**
 * Attribution of a comment imported from an external incident (technical preview).
 * The only metadata a comment may carry; any other metadata key is still rejected.
 */
export const ExternalSyncCommentMetadataSchema = z
  .object({
    externalId: z.string().min(1).max(1000),
    connectorName: z.string().min(1).max(1000),
    actor: z
      .object({
        name: z.string().min(1).max(1000),
        email: z.string().max(1000).optional(),
      })
      .strict()
      .optional(),
    externalCreatedAt: z.string().max(100).optional(),
  })
  .strict();

export type ExternalSyncCommentMetadata = z.infer<typeof ExternalSyncCommentMetadataSchema>;

export const CommentAttachmentMetadataSchema = z
  .object({ externalSync: ExternalSyncCommentMetadataSchema })
  .strict();

export const CommentAttachmentPayloadSchema = z
  .object({
    type: z.literal(COMMENT_ATTACHMENT_TYPE),
    owner: z.string(),
    data: CommentAttachmentDataSchema,
    metadata: CommentAttachmentMetadataSchema.optional(),
  })
  .strict();

export type CommentAttachmentPayload = z.infer<typeof CommentAttachmentPayloadSchema>;
