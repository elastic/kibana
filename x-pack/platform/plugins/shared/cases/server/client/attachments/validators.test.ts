/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { CommentAttachmentPayloadSchema } from '../../../common/types/domain_zod/attachment/comment/v2';
import { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { validateUnifiedRegisteredAttachments } from './validators';

describe('validateUnifiedRegisteredAttachments', () => {
  const validCommentPayload = {
    type: COMMENT_ATTACHMENT_TYPE,
    owner: 'cases',
    data: { content: 'hello world' },
  } as const;

  it('throws when the type is not registered', () => {
    const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();

    expect(() =>
      validateUnifiedRegisteredAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      })
    ).toThrow(/is not registered in unified attachment type registry/);
  });

  it('throws when neither `schema` nor `schemaValidator` is set', () => {
    const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
    unifiedAttachmentTypeRegistry.register({ id: COMMENT_ATTACHMENT_TYPE });

    expect(() =>
      validateUnifiedRegisteredAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      })
    ).toThrow(/does not define a schema validator/);
  });

  describe('when `schema` is set (preferred path)', () => {
    it('accepts a valid payload', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
      });

      expect(() =>
        validateUnifiedRegisteredAttachments({
          query: { ...validCommentPayload },
          unifiedAttachmentTypeRegistry,
        })
      ).not.toThrow();
    });

    it('rejects an invalid payload with a Boom badRequest', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
      });

      expect(() =>
        validateUnifiedRegisteredAttachments({
          query: { ...validCommentPayload, data: { content: '' } },
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/Invalid attachment payload for type 'comment'/);
    });

    it('summarizes zod issues with `path: message` in the error', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
      });

      expect(() =>
        validateUnifiedRegisteredAttachments({
          query: { ...validCommentPayload, data: { content: '' } },
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/data\.content: Comment content must be a non-empty string/);
    });

    it('prefers `schema` over a (legacy) `schemaValidator` when both are set', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      const legacyValidator = jest.fn();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
        schemaValidator: legacyValidator,
      });

      validateUnifiedRegisteredAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      });

      expect(legacyValidator).not.toHaveBeenCalled();
    });
  });

  describe('when only legacy `schemaValidator` is set (fallback path)', () => {
    it('passes the `data` slice for unified value attachments', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      const schemaValidator = jest.fn();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schemaValidator,
      });

      validateUnifiedRegisteredAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      });

      expect(schemaValidator).toHaveBeenCalledWith(validCommentPayload.data);
    });

    it('passes the `metadata` slice (or null) for unified reference attachments', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      const schemaValidator = jest.fn();
      unifiedAttachmentTypeRegistry.register({
        id: 'security.alert',
        schemaValidator,
      });

      validateUnifiedRegisteredAttachments({
        query: {
          type: 'security.alert',
          owner: 'securitySolution',
          attachmentId: 'alert-1',
        },
        unifiedAttachmentTypeRegistry,
      });

      expect(schemaValidator).toHaveBeenCalledWith(null);
    });

    it('rejects when the legacy validator throws', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schemaValidator: () => {
          throw new Error('legacy boom');
        },
      });

      expect(() =>
        validateUnifiedRegisteredAttachments({
          query: { ...validCommentPayload },
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/legacy boom/);
    });
  });

  it('applies the registered schema regardless of the registered id', () => {
    // Whatever schema is registered for an id is what gets enforced.
    const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
    unifiedAttachmentTypeRegistry.register({
      id: COMMENT_ATTACHMENT_TYPE,
      schema: z.object({ never: z.literal('matches') }),
    });

    expect(() =>
      validateUnifiedRegisteredAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      })
    ).toThrow(/Invalid attachment payload for type 'comment'/);
  });
});
