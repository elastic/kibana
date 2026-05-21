/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  LEGACY_LENS_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { CommentAttachmentPayloadSchema } from '../../../common/types/domain_zod/attachment/comment/v2';
import { LensAttachmentPayloadSchema } from '../../../common/types/domain_zod/attachment/lens/v2';
import { FileAttachmentPayloadSchema } from '../../../common/types/domain_zod/attachment/file/v2';
import { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { ExternalReferenceAttachmentTypeRegistry } from '../../attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import {
  validateLegacyRegisteredAttachments,
  validateUnifiedRegisteredAttachments,
} from './validators';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';

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

describe('validateLegacyRegisteredAttachments (migrated subtypes)', () => {
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();

  const validFileEntry = {
    name: 'screenshot',
    extension: 'png',
    mimeType: 'image/png',
    created: '2024-01-01T00:00:00.000Z',
  };

  const buildLegacyFilePayload = (overrides: Record<string, unknown> = {}) => ({
    type: AttachmentType.externalReference,
    externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
    externalReferenceId: 'file-so-id',
    externalReferenceStorage: {
      type: ExternalReferenceStorageType.savedObject,
      soType: FILE_SO_TYPE,
    },
    externalReferenceMetadata: { files: [validFileEntry] },
    owner: 'securitySolution',
    ...overrides,
  });

  const buildLegacyLensPayload = (overrides: Record<string, unknown> = {}) => ({
    type: AttachmentType.persistableState,
    persistableStateAttachmentTypeId: LEGACY_LENS_ATTACHMENT_TYPE,
    persistableStateAttachmentState: { state: { attributes: { state: { query: {} } } } },
    owner: 'securitySolution',
    ...overrides,
  });

  describe('migrated external reference (file)', () => {
    it('accepts a valid legacy `.files` payload after transforming and validating against the unified zod schema', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: FILE_ATTACHMENT_TYPE,
        schema: FileAttachmentPayloadSchema,
      });

      expect(() =>
        validateLegacyRegisteredAttachments({
          query: buildLegacyFilePayload() as never,
          persistableStateAttachmentTypeRegistry,
          externalReferenceAttachmentTypeRegistry,
          unifiedAttachmentTypeRegistry,
        })
      ).not.toThrow();
    });

    it('rejects a legacy `.files` payload with an invalid file entry (extra keys are strict)', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: FILE_ATTACHMENT_TYPE,
        schema: FileAttachmentPayloadSchema,
      });

      expect(() =>
        validateLegacyRegisteredAttachments({
          query: buildLegacyFilePayload({
            externalReferenceMetadata: {
              files: [{ ...validFileEntry, extra: 'not-allowed' }],
            },
          }) as never,
          persistableStateAttachmentTypeRegistry,
          externalReferenceAttachmentTypeRegistry,
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/Invalid attachment payload for type 'file'/);
    });

    it('rejects a legacy `.files` payload missing required file entry fields', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: FILE_ATTACHMENT_TYPE,
        schema: FileAttachmentPayloadSchema,
      });

      expect(() =>
        validateLegacyRegisteredAttachments({
          query: buildLegacyFilePayload({
            externalReferenceMetadata: { files: [{ name: 'screenshot' }] },
          }) as never,
          persistableStateAttachmentTypeRegistry,
          externalReferenceAttachmentTypeRegistry,
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/Invalid attachment payload for type 'file'/);
    });

    it('rejects a legacy `.files` payload with zero files', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: FILE_ATTACHMENT_TYPE,
        schema: FileAttachmentPayloadSchema,
      });

      expect(() =>
        validateLegacyRegisteredAttachments({
          query: buildLegacyFilePayload({
            externalReferenceMetadata: { files: [] },
          }) as never,
          persistableStateAttachmentTypeRegistry,
          externalReferenceAttachmentTypeRegistry,
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/Invalid attachment payload for type 'file'/);
    });
  });

  describe('migrated persistable state (lens)', () => {
    it('accepts a valid legacy `.lens` payload after transforming and validating against the unified zod schema', () => {
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: LENS_ATTACHMENT_TYPE,
        schema: LensAttachmentPayloadSchema,
      });

      expect(() =>
        validateLegacyRegisteredAttachments({
          query: buildLegacyLensPayload() as never,
          persistableStateAttachmentTypeRegistry,
          externalReferenceAttachmentTypeRegistry,
          unifiedAttachmentTypeRegistry,
        })
      ).not.toThrow();
    });

    it('routes the transformed legacy `.lens` payload through the unified zod schema', () => {
      // Register a stricter custom schema for `lens` and expect it to reject the
      // transformed payload, proving the legacy → unified validation path is wired.
      const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
      unifiedAttachmentTypeRegistry.register({
        id: LENS_ATTACHMENT_TYPE,
        schema: z.object({ never: z.literal('matches') }).strict(),
      });

      expect(() =>
        validateLegacyRegisteredAttachments({
          query: buildLegacyLensPayload() as never,
          persistableStateAttachmentTypeRegistry,
          externalReferenceAttachmentTypeRegistry,
          unifiedAttachmentTypeRegistry,
        })
      ).toThrow(/Invalid attachment payload for type 'lens'/);
    });
  });
});
