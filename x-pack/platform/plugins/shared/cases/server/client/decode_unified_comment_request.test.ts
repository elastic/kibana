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

  describe('when `schema` is set (preferred path)', () => {
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

    it('prefers `schema` over a (legacy) `schemaValidator` when both are set', () => {
      const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
      const legacyValidator = jest.fn();
      unifiedRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
        schemaValidator: legacyValidator,
      });

      decodeUnifiedCommentRequest({ ...validCommentPayload }, unifiedRegistry);

      expect(legacyValidator).not.toHaveBeenCalled();
    });
  });

  describe('when only legacy `schemaValidator` is set (fallback path)', () => {
    it('passes the `data` slice for unified value attachments', () => {
      const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
      const schemaValidator = jest.fn();
      unifiedRegistry.register({ id: COMMENT_ATTACHMENT_TYPE, schemaValidator });

      decodeUnifiedCommentRequest({ ...validCommentPayload }, unifiedRegistry);

      expect(schemaValidator).toHaveBeenCalledWith(validCommentPayload.data);
    });

    it('passes the `metadata` slice (or null) for unified reference attachments', () => {
      const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
      const schemaValidator = jest.fn();
      unifiedRegistry.register({ id: 'security.alert', schemaValidator });

      decodeUnifiedCommentRequest(
        {
          type: 'security.alert',
          owner: 'securitySolution',
          attachmentId: 'alert-1',
        },
        unifiedRegistry
      );

      expect(schemaValidator).toHaveBeenCalledWith(null);
    });
  });

  it('silently no-ops when neither `schema` nor `schemaValidator` is set', () => {
    // Pre-existing behavior; the API path (`validateUnifiedRegisteredAttachments`) throws instead.
    const unifiedRegistry = new UnifiedAttachmentTypeRegistry();
    unifiedRegistry.register({ id: COMMENT_ATTACHMENT_TYPE });

    expect(() =>
      decodeUnifiedCommentRequest({ ...validCommentPayload }, unifiedRegistry)
    ).not.toThrow();
  });
});
