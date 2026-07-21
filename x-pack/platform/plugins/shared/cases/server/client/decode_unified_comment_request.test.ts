/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMENT_ATTACHMENT_TYPE } from '../../common/constants/attachments';
import { CommentAttachmentPayloadSchema } from '../../common/types/domain_zod/attachment/comment/v2';
import { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { decodeUnifiedCommentRequest } from './utils';

describe('decodeUnifiedCommentRequest', () => {
  const validCommentPayload = {
    type: COMMENT_ATTACHMENT_TYPE,
    owner: 'cases',
    data: { content: 'hello world' },
  } as const;

  it('throws when the type is not registered', () => {
    const unifiedRegistry = new UnifiedAttachmentTypeRegistry();

    expect(() => decodeUnifiedCommentRequest({ ...validCommentPayload }, unifiedRegistry)).toThrow(
      /is not registered in unified attachment type registry/
    );
  });

  it('throws a Boom badRequest when a registered type has no schema (runtime misuse)', () => {
    const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
    // Simulate a type registered via `as any` that bypasses the required-schema type.
    unifiedRegistry.register({ id: COMMENT_ATTACHMENT_TYPE } as never);

    expect(() => decodeUnifiedCommentRequest({ ...validCommentPayload }, unifiedRegistry)).toThrow(
      /Attachment type 'comment' does not define a schema/
    );
  });

  describe('when `schema` is set', () => {
    it('accepts a valid payload', () => {
      const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
      });

      expect(() =>
        decodeUnifiedCommentRequest({ ...validCommentPayload }, unifiedRegistry)
      ).not.toThrow();
    });

    it('rejects an invalid payload with a Boom badRequest including the failing path', () => {
      const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
      });

      expect(() =>
        decodeUnifiedCommentRequest(
          { ...validCommentPayload, data: { content: '' } },
          unifiedRegistry
        )
      ).toThrow(/data\.content: Comment content must be a non-empty string/);
    });
  });
});
