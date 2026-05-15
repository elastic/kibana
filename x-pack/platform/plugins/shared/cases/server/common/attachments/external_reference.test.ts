/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import { LEGACY_FILE_ATTACHMENT_TYPE } from '../../../common/constants';
import { externalReferenceAttachmentTransformer } from './external_reference';

const baseLegacyAttributes = {
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: {
    username: 'elastic',
    full_name: null,
    email: null,
    profile_uid: undefined,
  },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

const legacyEndpointAttributes = {
  ...baseLegacyAttributes,
  type: AttachmentType.externalReference as const,
  externalReferenceId: 'action-123',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.elasticSearchDoc as const,
  },
  externalReferenceAttachmentTypeId: 'endpoint',
  externalReferenceMetadata: {
    command: 'isolate',
    comment: 'Test comment',
    targets: [{ endpointId: 'ep-1', hostname: 'host-1', agentType: 'endpoint' }],
  },
  owner: 'securitySolution',
};

const unifiedEndpointAttributes = {
  ...baseLegacyAttributes,
  type: 'security.endpoint',
  attachmentId: 'action-123',
  metadata: {
    command: 'isolate',
    comment: 'Test comment',
    targets: [{ endpointId: 'ep-1', hostname: 'host-1', agentType: 'endpoint' }],
  },
  owner: 'securitySolution',
};

describe('externalReferenceAttachmentTransformer', () => {
  describe('toUnifiedSchema', () => {
    it('converts legacy external reference to unified format', () => {
      const result =
        externalReferenceAttachmentTransformer.toUnifiedSchema(legacyEndpointAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          type: 'security.endpoint',
          attachmentId: 'action-123',
          metadata: legacyEndpointAttributes.externalReferenceMetadata,
          owner: 'securitySolution',
        })
      );
    });

    it('passes through already-unified attributes', () => {
      const result =
        externalReferenceAttachmentTransformer.toUnifiedSchema(unifiedEndpointAttributes);
      expect(result).toEqual(unifiedEndpointAttributes);
    });
  });

  describe('toLegacySchema', () => {
    it('converts unified format to legacy external reference', () => {
      const result =
        externalReferenceAttachmentTransformer.toLegacySchema(unifiedEndpointAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          type: AttachmentType.externalReference,
          externalReferenceId: 'action-123',
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.elasticSearchDoc,
          },
          externalReferenceAttachmentTypeId: 'endpoint',
          externalReferenceMetadata: unifiedEndpointAttributes.metadata,
          owner: 'securitySolution',
        })
      );
    });

    it('passes through already-legacy attributes', () => {
      const result =
        externalReferenceAttachmentTransformer.toLegacySchema(legacyEndpointAttributes);
      expect(result).toEqual(legacyEndpointAttributes);
    });
  });

  describe('type guards', () => {
    it('isType detects both legacy and unified', () => {
      expect(externalReferenceAttachmentTransformer.isType(legacyEndpointAttributes as never)).toBe(
        true
      );
      expect(
        externalReferenceAttachmentTransformer.isType(unifiedEndpointAttributes as never)
      ).toBe(true);
      expect(
        externalReferenceAttachmentTransformer.isType({ type: AttachmentType.alert } as never)
      ).toBe(false);
    });

    it('does not match unmigrated external reference subtypes', () => {
      const unmigrated = {
        ...legacyEndpointAttributes,
        externalReferenceAttachmentTypeId: 'some-unknown-type',
      };
      expect(externalReferenceAttachmentTransformer.isType(unmigrated as never)).toBe(false);
    });

    it('isUnifiedType detects only unified', () => {
      expect(externalReferenceAttachmentTransformer.isUnifiedType(unifiedEndpointAttributes)).toBe(
        true
      );
      expect(externalReferenceAttachmentTransformer.isUnifiedType(legacyEndpointAttributes)).toBe(
        false
      );
    });

    it('isLegacyType detects only legacy', () => {
      expect(externalReferenceAttachmentTransformer.isLegacyType(legacyEndpointAttributes)).toBe(
        true
      );
      expect(externalReferenceAttachmentTransformer.isLegacyType(unifiedEndpointAttributes)).toBe(
        false
      );
    });

    it('isUnifiedType rejects payloads where attachmentId is not a single id string', () => {
      // External-reference unified attachments require `attachmentId: string`. The
      // shared `AttachmentAttributesV2` union allows `string | string[]` for alert/event
      // attachments, so the guard explicitly narrows to reject arrays coming via API.
      expect(
        externalReferenceAttachmentTransformer.isUnifiedType({
          ...unifiedEndpointAttributes,
          attachmentId: ['a', 'b'],
        })
      ).toBe(false);

      expect(
        externalReferenceAttachmentTransformer.isUnifiedType({
          ...unifiedEndpointAttributes,
          attachmentId: undefined,
        })
      ).toBe(false);
    });
  });

  describe('payload transforms', () => {
    const legacyPayload = {
      type: AttachmentType.externalReference as const,
      externalReferenceId: 'action-456',
      externalReferenceStorage: {
        type: ExternalReferenceStorageType.elasticSearchDoc as const,
      },
      externalReferenceAttachmentTypeId: 'endpoint',
      externalReferenceMetadata: {
        command: 'unisolate',
        comment: '',
        targets: [{ endpointId: 'ep-2', hostname: 'host-2', agentType: 'endpoint' }],
      },
      owner: 'securitySolution',
    };

    const unifiedPayload = {
      type: 'security.endpoint',
      attachmentId: 'action-456',
      metadata: {
        command: 'unisolate',
        comment: '',
        targets: [{ endpointId: 'ep-2', hostname: 'host-2', agentType: 'endpoint' }],
      },
      owner: 'securitySolution',
    };

    it('toUnifiedPayload converts legacy payload', () => {
      const result = externalReferenceAttachmentTransformer.toUnifiedPayload(legacyPayload);
      expect(result).toEqual(unifiedPayload);
    });

    it('toUnifiedPayload throws for non-legacy payload', () => {
      expect(() => externalReferenceAttachmentTransformer.toUnifiedPayload(unifiedPayload)).toThrow(
        'Expected legacy external reference attachment payload'
      );
    });

    it('toLegacyPayload converts unified payload', () => {
      const result = externalReferenceAttachmentTransformer.toLegacyPayload(unifiedPayload);
      expect(result).toEqual(legacyPayload);
    });

    it('toLegacyPayload throws for non-unified payload', () => {
      expect(() => externalReferenceAttachmentTransformer.toLegacyPayload(legacyPayload)).toThrow(
        'Expected unified external reference attachment payload'
      );
    });

    it('isLegacyPayload detects legacy payloads', () => {
      expect(externalReferenceAttachmentTransformer.isLegacyPayload(legacyPayload)).toBe(true);
      expect(externalReferenceAttachmentTransformer.isLegacyPayload(unifiedPayload)).toBe(false);
    });

    it('isUnifiedPayload detects unified payloads', () => {
      expect(externalReferenceAttachmentTransformer.isUnifiedPayload(unifiedPayload)).toBe(true);
      expect(externalReferenceAttachmentTransformer.isUnifiedPayload(legacyPayload)).toBe(false);
    });
  });

  describe('soType lift/lower', () => {
    const fileSoType = 'file';
    const legacyFileAttributes = {
      ...baseLegacyAttributes,
      type: AttachmentType.externalReference as const,
      externalReferenceId: 'file-id-1',
      externalReferenceStorage: {
        type: ExternalReferenceStorageType.savedObject as const,
        soType: fileSoType,
      },
      externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
      externalReferenceMetadata: {
        files: [
          {
            name: 'foo',
            extension: 'png',
            mimeType: 'image/png',
            created: '2024-01-01T00:00:00.000Z',
          },
        ],
      },
      owner: 'securitySolution',
    };

    it('lifts soType into metadata.soType on toUnifiedSchema', () => {
      const result = externalReferenceAttachmentTransformer.toUnifiedSchema(legacyFileAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          attachmentId: 'file-id-1',
          metadata: expect.objectContaining({
            soType: fileSoType,
            files: legacyFileAttributes.externalReferenceMetadata.files,
          }),
        })
      );
    });

    it('lowers metadata.soType back into externalReferenceStorage on toLegacySchema', () => {
      const unified = externalReferenceAttachmentTransformer.toUnifiedSchema(legacyFileAttributes);
      const round = externalReferenceAttachmentTransformer.toLegacySchema(unified);

      expect(round).toEqual(
        expect.objectContaining({
          type: AttachmentType.externalReference,
          externalReferenceId: 'file-id-1',
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.savedObject,
            soType: fileSoType,
          },
          externalReferenceMetadata: {
            files: legacyFileAttributes.externalReferenceMetadata.files,
          },
          owner: 'securitySolution',
        })
      );
      expect(
        (round as { externalReferenceMetadata?: Record<string, unknown> }).externalReferenceMetadata
      ).not.toHaveProperty('soType');
    });

    it('round-trips toUnifiedSchema -> toLegacySchema for savedObject-backed externalReferences', () => {
      const unified = externalReferenceAttachmentTransformer.toUnifiedSchema(legacyFileAttributes);
      const round = externalReferenceAttachmentTransformer.toLegacySchema(unified);
      expect(round).toEqual(legacyFileAttributes);
    });

    it('round-trips toUnifiedPayload -> toLegacyPayload for savedObject-backed externalReferences', () => {
      const legacyPayload = {
        type: AttachmentType.externalReference as const,
        externalReferenceId: 'file-id-2',
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.savedObject as const,
          soType: fileSoType,
        },
        externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
        externalReferenceMetadata: {
          files: [
            {
              name: 'bar',
              extension: 'pdf',
              mimeType: 'application/pdf',
              created: '2024-01-02T00:00:00.000Z',
            },
          ],
        },
        owner: 'securitySolution',
      };
      const unified = externalReferenceAttachmentTransformer.toUnifiedPayload(legacyPayload);
      expect(unified.metadata).toEqual(
        expect.objectContaining({
          soType: fileSoType,
          files: legacyPayload.externalReferenceMetadata.files,
        })
      );
      const round = externalReferenceAttachmentTransformer.toLegacyPayload(unified);
      expect(round).toEqual(legacyPayload);
    });

    it('does not alter metadata for elasticSearchDoc-backed externalReferences', () => {
      const result =
        externalReferenceAttachmentTransformer.toUnifiedSchema(legacyEndpointAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          metadata: legacyEndpointAttributes.externalReferenceMetadata,
        })
      );
      expect((result as { metadata?: Record<string, unknown> }).metadata).not.toHaveProperty(
        'soType'
      );
    });

    it('falls back to static type-id storage map when metadata.soType is absent on the unified row', () => {
      const round =
        externalReferenceAttachmentTransformer.toLegacySchema(unifiedEndpointAttributes);
      expect(round).toEqual(
        expect.objectContaining({
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.elasticSearchDoc,
          },
        })
      );
    });
  });
});
