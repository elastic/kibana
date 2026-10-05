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
import { validateUnifiedAttachments } from './validators';

describe('validateUnifiedAttachments', () => {
  const validCommentPayload = {
    type: COMMENT_ATTACHMENT_TYPE,
    owner: 'cases',
    data: { content: 'hello world' },
  } as const;

  it('throws when the type is not registered', () => {
    const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();

    expect(() =>
      validateUnifiedAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      })
    ).toThrow(/is not registered in unified attachment type registry/);
  });

  it('throws a Boom badRequest when a registered type has no schema (runtime misuse)', () => {
    const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
    // Simulate a type registered via `as any` that bypasses the required-schema type.
    unifiedAttachmentTypeRegistry.register({ id: COMMENT_ATTACHMENT_TYPE } as never);

    expect(() =>
      validateUnifiedAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      })
    ).toThrow(/Attachment type 'comment' does not define a schema/);
  });

  describe('when `schema` is set', () => {
    it('accepts a valid payload', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: COMMENT_ATTACHMENT_TYPE,
        schema: CommentAttachmentPayloadSchema,
      });

      expect(() =>
        validateUnifiedAttachments({
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
        validateUnifiedAttachments({
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
        validateUnifiedAttachments({
          query: { ...validCommentPayload, data: { content: '' } },
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/data\.content: Comment content must be a non-empty string/);
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
      validateUnifiedAttachments({
        query: { ...validCommentPayload },
        unifiedAttachmentTypeRegistry,
      })
    ).toThrow(/Invalid attachment payload for type 'comment'/);
  });
});
