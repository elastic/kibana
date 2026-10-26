/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_IDS_PER_ATTACHMENT,
  MAX_OWNER_LENGTH,
} from '../../../common/constants';
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

  describe('type-agnostic bounds', () => {
    const referenceType = 'test.reference';
    const registry = () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: referenceType,
        schema: z.object({}).loose(),
      });
      return unifiedAttachmentTypeRegistry;
    };
    const referencePayload = { type: referenceType, owner: 'cases', attachmentId: 'id-1' };

    it('accepts a payload within bounds even if the registered schema is unbounded', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: {
            ...referencePayload,
            attachmentId: Array.from({ length: MAX_IDS_PER_ATTACHMENT }, (_, i) => `id-${i}`),
          },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).not.toThrow();
    });

    it('rejects a type over the max length before the registry check', () => {
      const type = 'a'.repeat(MAX_ATTACHMENT_TYPE_LENGTH + 1);

      expect(() =>
        validateUnifiedAttachments({
          query: { ...referencePayload, type },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(/^Invalid attachment payload: type:/);
    });

    it('does not echo an oversized type or owner in the error', () => {
      const type = 'a'.repeat(MAX_ATTACHMENT_TYPE_LENGTH + 1);
      const owner = 'b'.repeat(MAX_OWNER_LENGTH + 1);

      expect(() =>
        validateUnifiedAttachments({
          query: { ...referencePayload, type, owner },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(expect.objectContaining({ message: expect.not.stringMatching(/aaaa|bbbb/) }));
    });

    it('rejects an owner over the max length', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: { ...referencePayload, owner: 'a'.repeat(MAX_OWNER_LENGTH + 1) },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(/owner:/);
    });

    it('rejects data over the max serialized length', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: {
            ...referencePayload,
            data: {
              a: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH / 2),
              b: 'b'.repeat(MAX_ATTACHMENT_JSON_LENGTH / 2),
            },
          },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(/data: The data field is too large/);
    });

    it('rejects metadata over the max serialized length', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: {
            ...referencePayload,
            metadata: { index: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH) },
          },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(/metadata: The metadata field is too large/);
    });

    it('rejects an attachmentId over the max length', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: { ...referencePayload, attachmentId: 'a'.repeat(MAX_ATTACHMENT_ID_LENGTH + 1) },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(/attachmentId:/);
    });

    it('rejects an attachmentId array over the max size', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: {
            ...referencePayload,
            attachmentId: Array.from({ length: MAX_IDS_PER_ATTACHMENT + 1 }, (_, i) => `id-${i}`),
          },
          unifiedAttachmentTypeRegistry: registry(),
        })
      ).toThrow(/attachmentId:/);
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

  describe('owner consistency', () => {
    const securityEventType = 'security.event';
    const registryWithEvent = () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: securityEventType,
        schema: z.object({ type: z.literal(securityEventType), owner: z.string() }).loose(),
      });
      return unifiedAttachmentTypeRegistry;
    };

    it('rejects a solution-scoped type under another solution owner', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: { type: securityEventType, owner: 'observability', attachmentId: 'event-1' },
          unifiedAttachmentTypeRegistry: registryWithEvent(),
        })
      ).toThrow(/cannot be attached to a case with owner observability/);
    });

    it('accepts a solution-scoped type under its own owner', () => {
      expect(() =>
        validateUnifiedAttachments({
          query: { type: securityEventType, owner: 'securitySolution', attachmentId: 'event-1' },
          unifiedAttachmentTypeRegistry: registryWithEvent(),
        })
      ).not.toThrow();
    });

    it('rejects before running the schema', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: securityEventType,
        schema: z.object({ never: z.literal('matches') }),
      });

      expect(() =>
        validateUnifiedAttachments({
          query: { type: securityEventType, owner: 'cases', attachmentId: 'event-1' },
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/cannot be attached to a case with owner cases/);
    });
  });
});
