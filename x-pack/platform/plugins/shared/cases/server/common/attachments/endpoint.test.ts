/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import { endpointAttachmentTransformer } from './endpoint';

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

const legacyAttributes = {
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

const unifiedAttributes = {
  ...baseLegacyAttributes,
  type: 'endpoint',
  attachmentId: 'action-123',
  metadata: {
    command: 'isolate',
    comment: 'Test comment',
    targets: [{ endpointId: 'ep-1', hostname: 'host-1', agentType: 'endpoint' }],
  },
  owner: 'securitySolution',
};

describe('endpointAttachmentTransformer', () => {
  describe('toUnifiedSchema', () => {
    it('converts legacy external reference to unified format', () => {
      const result = endpointAttachmentTransformer.toUnifiedSchema(legacyAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          type: 'endpoint',
          attachmentId: 'action-123',
          metadata: legacyAttributes.externalReferenceMetadata,
          owner: 'securitySolution',
        })
      );
    });

    it('passes through already-unified attributes', () => {
      const result = endpointAttachmentTransformer.toUnifiedSchema(unifiedAttributes);
      expect(result).toEqual(unifiedAttributes);
    });
  });

  describe('toLegacySchema', () => {
    it('converts unified format to legacy external reference', () => {
      const result = endpointAttachmentTransformer.toLegacySchema(unifiedAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          type: AttachmentType.externalReference,
          externalReferenceId: 'action-123',
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.elasticSearchDoc,
          },
          externalReferenceAttachmentTypeId: 'endpoint',
          externalReferenceMetadata: unifiedAttributes.metadata,
          owner: 'securitySolution',
        })
      );
    });

    it('passes through already-legacy attributes', () => {
      const result = endpointAttachmentTransformer.toLegacySchema(legacyAttributes);
      expect(result).toEqual(legacyAttributes);
    });
  });

  describe('type guards', () => {
    it('isType detects both legacy and unified', () => {
      expect(endpointAttachmentTransformer.isType(legacyAttributes as never)).toBe(true);
      expect(endpointAttachmentTransformer.isType(unifiedAttributes as never)).toBe(true);
      expect(endpointAttachmentTransformer.isType({ type: AttachmentType.alert } as never)).toBe(
        false
      );
    });

    it('isUnifiedType detects only unified', () => {
      expect(endpointAttachmentTransformer.isUnifiedType(unifiedAttributes)).toBe(true);
      expect(endpointAttachmentTransformer.isUnifiedType(legacyAttributes)).toBe(false);
    });

    it('isLegacyType detects only legacy', () => {
      expect(endpointAttachmentTransformer.isLegacyType(legacyAttributes)).toBe(true);
      expect(endpointAttachmentTransformer.isLegacyType(unifiedAttributes)).toBe(false);
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
      type: 'endpoint',
      attachmentId: 'action-456',
      metadata: {
        command: 'unisolate',
        comment: '',
        targets: [{ endpointId: 'ep-2', hostname: 'host-2', agentType: 'endpoint' }],
      },
      owner: 'securitySolution',
    };

    it('toUnifiedPayload converts legacy payload', () => {
      const result = endpointAttachmentTransformer.toUnifiedPayload(legacyPayload);
      expect(result).toEqual(unifiedPayload);
    });

    it('toLegacyPayload converts unified payload', () => {
      const result = endpointAttachmentTransformer.toLegacyPayload(unifiedPayload);
      expect(result).toEqual(legacyPayload);
    });

    it('isLegacyPayload detects legacy payloads', () => {
      expect(endpointAttachmentTransformer.isLegacyPayload(legacyPayload)).toBe(true);
      expect(endpointAttachmentTransformer.isLegacyPayload(unifiedPayload)).toBe(false);
    });

    it('isUnifiedPayload detects unified payloads', () => {
      expect(endpointAttachmentTransformer.isUnifiedPayload(unifiedPayload)).toBe(true);
      expect(endpointAttachmentTransformer.isUnifiedPayload(legacyPayload)).toBe(false);
    });
  });
});
