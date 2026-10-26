/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { badRequest } from '@hapi/boom';
import {
  CommentAttachmentDataSchema,
  CommentAttachmentPayloadSchema,
} from '../../../common/types/domain_zod/attachment/comment/v2';
import type { CommentAttachmentData } from '../../../common/types/domain_zod/attachment/comment/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

export const commentAttachmentType: UnifiedAttachmentTypeSetup = {
  id: COMMENT_ATTACHMENT_TYPE,
  schema: CommentAttachmentPayloadSchema,
};

export type { CommentAttachmentData };

/** Decodes the `data` slice for SO transformer / read paths that don't have the full payload. */
export const decodeCommentAttachmentData = (data: unknown): CommentAttachmentData => {
  const result = CommentAttachmentDataSchema.safeParse(data);
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message ?? 'Invalid comment attachment data');
  }
  return result.data;
};
