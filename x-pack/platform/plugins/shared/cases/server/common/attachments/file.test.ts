/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import {
  FILE_ATTACHMENT_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { externalReferenceAttachmentTransformer } from './external_reference';
import { getAttachmentTypeFromAttributes, getAttachmentTypeTransformers } from '.';

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

const fileMetadata = {
  files: [
    {
      name: 'screenshot',
      extension: 'png',
      mimeType: 'image/png',
      created: '2024-01-01T00:00:00.000Z',
    },
  ],
};

const legacyFileAttributes = {
  ...baseLegacyAttributes,
  type: AttachmentType.externalReference as const,
  externalReferenceId: 'file-id-1',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.savedObject as const,
    soType: FILE_SO_TYPE,
  },
  externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
  externalReferenceMetadata: fileMetadata,
  owner: 'securitySolution',
};

describe('file attachment transformation (via externalReferenceAttachmentTransformer)', () => {
  describe('dispatcher routing', () => {
    it('resolves legacy .files to the unified `file` type via getAttachmentTypeFromAttributes', () => {
      expect(getAttachmentTypeFromAttributes(legacyFileAttributes)).toBe(FILE_ATTACHMENT_TYPE);
    });

    it('returns externalReferenceAttachmentTransformer for the unified `file` type', () => {
      const transformer = getAttachmentTypeTransformers(FILE_ATTACHMENT_TYPE, 'securitySolution');
      expect(transformer).toBe(externalReferenceAttachmentTransformer);
    });
  });

  describe('round-trip', () => {
    it('round-trips legacy .files -> unified file -> legacy .files (toUnifiedSchema/toLegacySchema)', () => {
      const unified = externalReferenceAttachmentTransformer.toUnifiedSchema(legacyFileAttributes);
      expect(unified).toEqual(
        expect.objectContaining({
          type: FILE_ATTACHMENT_TYPE,
          attachmentId: 'file-id-1',
          metadata: {
            ...fileMetadata,
            soType: FILE_SO_TYPE,
          },
          owner: 'securitySolution',
        })
      );

      const round = externalReferenceAttachmentTransformer.toLegacySchema(unified);
      expect(round).toEqual(legacyFileAttributes);
    });

    it('round-trips legacy .files payload -> unified file payload -> legacy .files payload', () => {
      const legacyPayload = {
        type: AttachmentType.externalReference as const,
        externalReferenceId: 'file-id-2',
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.savedObject as const,
          soType: FILE_SO_TYPE,
        },
        externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
        externalReferenceMetadata: fileMetadata,
        owner: 'securitySolution',
      };

      const unified = externalReferenceAttachmentTransformer.toUnifiedPayload(legacyPayload);
      expect(unified).toEqual({
        type: FILE_ATTACHMENT_TYPE,
        attachmentId: 'file-id-2',
        metadata: {
          ...fileMetadata,
          soType: FILE_SO_TYPE,
        },
        owner: 'securitySolution',
      });

      const round = externalReferenceAttachmentTransformer.toLegacyPayload(unified);
      expect(round).toEqual(legacyPayload);
    });
  });

  describe('soType preservation', () => {
    it('lifts FILE_SO_TYPE into metadata.soType so the unified pipeline can extract attachmentId into references', () => {
      const unified = externalReferenceAttachmentTransformer.toUnifiedSchema(
        legacyFileAttributes
      ) as unknown as { metadata: { soType: string } };
      expect(unified.metadata.soType).toBe(FILE_SO_TYPE);
    });

    it('lowers metadata.soType back into externalReferenceStorage.soType', () => {
      const unifiedFile = {
        ...baseLegacyAttributes,
        type: FILE_ATTACHMENT_TYPE,
        attachmentId: 'file-id-3',
        metadata: { ...fileMetadata, soType: FILE_SO_TYPE },
        owner: 'securitySolution',
      };
      const legacy = externalReferenceAttachmentTransformer.toLegacySchema(unifiedFile);
      expect(legacy).toEqual(
        expect.objectContaining({
          type: AttachmentType.externalReference,
          externalReferenceId: 'file-id-3',
          externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.savedObject,
            soType: FILE_SO_TYPE,
          },
          externalReferenceMetadata: fileMetadata,
        })
      );
    });

    it('falls back to the static type-id storage map when metadata.soType is absent', () => {
      // Pre-migration unified rows lack the lift; legacy projection should still
      // resolve soType via EXTERNAL_REFERENCE_STORAGE_BY_TYPE_ID.
      const unifiedFileWithoutSoType = {
        ...baseLegacyAttributes,
        type: FILE_ATTACHMENT_TYPE,
        attachmentId: 'file-id-4',
        metadata: fileMetadata,
        owner: 'securitySolution',
      };
      const legacy =
        externalReferenceAttachmentTransformer.toLegacySchema(unifiedFileWithoutSoType);
      expect(legacy).toEqual(
        expect.objectContaining({
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.savedObject,
            soType: FILE_SO_TYPE,
          },
          externalReferenceAttachmentTypeId: LEGACY_FILE_ATTACHMENT_TYPE,
        })
      );
    });
  });
});
