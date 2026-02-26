/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { badRequest } from '@hapi/boom';
import * as rt from 'io-ts';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';

export const commentAttachmentType: UnifiedAttachmentTypeSetup = {
  id: COMMENT_ATTACHMENT_TYPE,
  schemaValidator: (data: unknown) => {
    decodeCommentAttachmentData(data);
  },
};

/**
 * Single source of truth for comment attachment data shape.
 * Used by: registry validator (on write) and schema transformer (on read/transform).
 * Define → register & validate → then transform; no data-specific checks in cases main codebase.
 */
export const CommentAttachmentDataRt = rt.strict({
  content: rt.string,
});

export type CommentAttachmentData = rt.TypeOf<typeof CommentAttachmentDataRt>;

/**
 * Decodes and validates comment attachment data.
 * Enforces non-empty content. Use this for both registry validation and parsing in the transformer.
 */
export const decodeCommentAttachmentData = (data: unknown): CommentAttachmentData => {
  const validated = decodeWithExcessOrThrow(CommentAttachmentDataRt)(data);

  if (validated.content.trim().length === 0) {
    throw badRequest('Comment content must be a non-empty string');
  }

  return validated;
};
