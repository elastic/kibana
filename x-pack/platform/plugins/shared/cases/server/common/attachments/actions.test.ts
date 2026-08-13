/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  ExternalReferenceStorageType,
  type ActionsAttachmentPayload,
} from '../../../common/types/domain';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import type {
  AttachmentAttributesV2,
  UnifiedReferenceAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import {
  LEGACY_ACTIONS_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants/owners';
import { actionsAttachmentTransformer, LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID } from './actions';

const baseCommonAttributes = {
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

const legacyActionsPayload: ActionsAttachmentPayload = {
  type: AttachmentType.actions,
  comment: 'Isolated the host because of suspicious activity',
  actions: {
    type: 'isolate',
    targets: [
      { hostname: 'host-1', endpointId: 'ep-1' },
      { hostname: 'host-2', endpointId: 'ep-2' },
    ],
  },
  owner: SECURITY_SOLUTION_OWNER,
};

const legacyActionsAttributes = {
  ...baseCommonAttributes,
  ...legacyActionsPayload,
};

const expectedUnifiedData = {
  content: legacyActionsPayload.comment,
};

const expectedUnifiedMetadata = {
  command: 'isolate',
  targets: [
    { endpointId: 'ep-1', hostname: 'host-1', agentType: 'endpoint' },
    { endpointId: 'ep-2', hostname: 'host-2', agentType: 'endpoint' },
  ],
};

/**
 * When projecting unified `security.endpoint` back to legacy `externalReference`,
 * the external-reference transformer merges `data.content` back into
 * `externalReferenceMetadata.comment` so legacy-mode renderers keep working.
 */
const expectedLegacyExternalReferenceMetadata = {
  ...expectedUnifiedMetadata,
  comment: legacyActionsPayload.comment,
};

const unifiedEndpointAttributes = {
  ...baseCommonAttributes,
  type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  attachmentId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
  data: expectedUnifiedData,
  metadata: expectedUnifiedMetadata,
  owner: SECURITY_SOLUTION_OWNER,
};

const unifiedEndpointPayload: UnifiedReferenceAttachmentPayload = {
  type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  attachmentId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
  owner: SECURITY_SOLUTION_OWNER,
  data: expectedUnifiedData,
  metadata: expectedUnifiedMetadata,
};

describe('actionsAttachmentTransformer', () => {
  describe('toUnifiedSchema', () => {
    it('promotes the legacy `comment` field into `data.content`', () => {
      const result = actionsAttachmentTransformer.toUnifiedSchema(legacyActionsAttributes);
      expect(result).toEqual(
        expect.objectContaining({
          type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
          attachmentId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
          owner: SECURITY_SOLUTION_OWNER,
          data: expectedUnifiedData,
          metadata: expectedUnifiedMetadata,
        })
      );
      // metadata must NOT carry the analyst comment any more
      expect((result as { metadata?: { comment?: unknown } }).metadata?.comment).toBeUndefined();
    });

    it('preserves common attributes when converting', () => {
      const result = actionsAttachmentTransformer.toUnifiedSchema({
        ...legacyActionsAttributes,
        updated_at: '2024-02-02T00:00:00.000Z',
        updated_by: {
          username: 'alice',
          full_name: 'Alice',
          email: 'alice@example.com',
          profile_uid: 'p-1',
        },
      });
      expect(result).toMatchObject({
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-02-02T00:00:00.000Z',
        updated_by: {
          username: 'alice',
          full_name: 'Alice',
          email: 'alice@example.com',
          profile_uid: 'p-1',
        },
      });
    });

    it('passes through attributes that are not legacy actions', () => {
      const alreadyUnified = { ...unifiedEndpointAttributes, attachmentId: 'action-1' };
      expect(actionsAttachmentTransformer.toUnifiedSchema(alreadyUnified)).toEqual(alreadyUnified);
    });

    it('defaults agentType to endpoint when targets omit it', () => {
      const result = actionsAttachmentTransformer.toUnifiedSchema({
        ...legacyActionsAttributes,
        actions: {
          type: 'unisolate',
          targets: [{ hostname: 'host-3', endpointId: 'ep-3' }],
        },
      });
      expect(result).toMatchObject({
        metadata: {
          command: 'unisolate',
          targets: [{ endpointId: 'ep-3', hostname: 'host-3', agentType: 'endpoint' }],
        },
      });
    });

    it('throws Boom.badRequest for legacy rows with an empty targets array', () => {
      expect(() =>
        actionsAttachmentTransformer.toUnifiedSchema({
          ...legacyActionsAttributes,
          actions: { type: 'isolate', targets: [] },
        })
      ).toThrow('legacy actions row has no targets to migrate');
    });

    it('preserves a non-security owner verbatim on projection (transformer is owner-agnostic)', () => {
      const projected = actionsAttachmentTransformer.toUnifiedSchema({
        ...legacyActionsAttributes,
        owner: 'observability',
      }) as { owner: string };
      expect(projected.owner).toBe('observability');
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'legacy'],
      ['a number', 42],
    ])('passes %s through unchanged', (_label, value) => {
      expect(actionsAttachmentTransformer.toUnifiedSchema(value)).toBe(value);
    });

    it('passes malformed legacy rows through unchanged (fails the shape predicate)', () => {
      const missingActions = {
        ...baseCommonAttributes,
        type: LEGACY_ACTIONS_TYPE,
        comment: 'x',
        owner: SECURITY_SOLUTION_OWNER,
      };
      const missingTargets = {
        ...baseCommonAttributes,
        type: LEGACY_ACTIONS_TYPE,
        comment: 'x',
        owner: SECURITY_SOLUTION_OWNER,
        actions: { type: 'isolate' },
      };
      const targetsWrongType = {
        ...baseCommonAttributes,
        type: LEGACY_ACTIONS_TYPE,
        comment: 'x',
        owner: SECURITY_SOLUTION_OWNER,
        actions: { type: 'isolate', targets: 'oops' },
      };
      const targetsArrayOfNonObjects = {
        ...baseCommonAttributes,
        type: LEGACY_ACTIONS_TYPE,
        comment: 'x',
        owner: SECURITY_SOLUTION_OWNER,
        actions: { type: 'isolate', targets: [1, 2] },
      };
      const targetsArrayMissingFields = {
        ...baseCommonAttributes,
        type: LEGACY_ACTIONS_TYPE,
        comment: 'x',
        owner: SECURITY_SOLUTION_OWNER,
        actions: { type: 'isolate', targets: [{ endpointId: 'ep' }] },
      };
      expect(actionsAttachmentTransformer.toUnifiedSchema(missingActions)).toBe(missingActions);
      expect(actionsAttachmentTransformer.toUnifiedSchema(missingTargets)).toBe(missingTargets);
      expect(actionsAttachmentTransformer.toUnifiedSchema(targetsWrongType)).toBe(targetsWrongType);
      expect(actionsAttachmentTransformer.toUnifiedSchema(targetsArrayOfNonObjects)).toBe(
        targetsArrayOfNonObjects
      );
      expect(actionsAttachmentTransformer.toUnifiedSchema(targetsArrayMissingFields)).toBe(
        targetsArrayMissingFields
      );
    });
  });

  describe('toLegacySchema (delegates to externalReferenceAttachmentTransformer)', () => {
    it('passes legacy actions attributes through unchanged (neither legacy-externalReference nor unified)', () => {
      expect(actionsAttachmentTransformer.toLegacySchema(legacyActionsAttributes)).toBe(
        legacyActionsAttributes
      );
    });

    it('projects unified security.endpoint attributes back to the legacy externalReference shape and merges data.content into the comment', () => {
      const result = actionsAttachmentTransformer.toLegacySchema(unifiedEndpointAttributes);
      expect(result).toMatchObject({
        type: AttachmentType.externalReference,
        externalReferenceId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
        externalReferenceAttachmentTypeId: 'endpoint',
        externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
        externalReferenceMetadata: expectedLegacyExternalReferenceMetadata,
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('round-trips legacy actions → unified → legacy externalReference and preserves the analyst comment', () => {
      const unified = actionsAttachmentTransformer.toUnifiedSchema(legacyActionsAttributes);
      const legacy = actionsAttachmentTransformer.toLegacySchema(unified);
      expect(legacy).toMatchObject({
        type: AttachmentType.externalReference,
        externalReferenceAttachmentTypeId: 'endpoint',
        externalReferenceId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
        externalReferenceMetadata: expectedLegacyExternalReferenceMetadata,
        owner: SECURITY_SOLUTION_OWNER,
      });
      // Critically: never re-emits the deprecated top-level `actions` type.
      expect((legacy as { type: string }).type).not.toBe(LEGACY_ACTIONS_TYPE);
    });
  });

  describe('type guards', () => {
    it('isType matches only the legacy actions shape', () => {
      expect(
        actionsAttachmentTransformer.isType(legacyActionsAttributes as AttachmentAttributesV2)
      ).toBe(true);
      expect(
        actionsAttachmentTransformer.isType(unifiedEndpointAttributes as AttachmentAttributesV2)
      ).toBe(false);
      expect(
        actionsAttachmentTransformer.isType({
          type: AttachmentType.alert,
        } as unknown as AttachmentAttributesV2)
      ).toBe(false);
    });

    it('isLegacyType matches only legacy actions and rejects malformed rows', () => {
      expect(actionsAttachmentTransformer.isLegacyType(legacyActionsAttributes)).toBe(true);
      // Missing `actions` field
      expect(actionsAttachmentTransformer.isLegacyType({ type: LEGACY_ACTIONS_TYPE })).toBe(false);
      // Missing required string `comment`
      expect(
        actionsAttachmentTransformer.isLegacyType({
          type: LEGACY_ACTIONS_TYPE,
          actions: { type: 'isolate', targets: [] },
        })
      ).toBe(false);
      // `targets` is not an array
      expect(
        actionsAttachmentTransformer.isLegacyType({
          type: LEGACY_ACTIONS_TYPE,
          comment: 'x',
          owner: SECURITY_SOLUTION_OWNER,
          actions: { type: 'isolate', targets: 'nope' },
        })
      ).toBe(false);
      // targets array contains non-objects
      expect(
        actionsAttachmentTransformer.isLegacyType({
          type: LEGACY_ACTIONS_TYPE,
          comment: 'x',
          owner: SECURITY_SOLUTION_OWNER,
          actions: { type: 'isolate', targets: [1, 2] },
        })
      ).toBe(false);
      // targets array entries missing required string fields
      expect(
        actionsAttachmentTransformer.isLegacyType({
          type: LEGACY_ACTIONS_TYPE,
          comment: 'x',
          owner: SECURITY_SOLUTION_OWNER,
          actions: { type: 'isolate', targets: [{ endpointId: 'ep' }] },
        })
      ).toBe(false);
      expect(actionsAttachmentTransformer.isLegacyType(null)).toBe(false);
      expect(actionsAttachmentTransformer.isLegacyType('string')).toBe(false);
    });

    it('isUnifiedType is always false (security.endpoint is owned by the external reference transformer)', () => {
      expect(actionsAttachmentTransformer.isUnifiedType(unifiedEndpointAttributes)).toBe(false);
    });
  });

  describe('payload transforms', () => {
    it('toUnifiedPayload converts legacy actions payload', () => {
      const result = actionsAttachmentTransformer.toUnifiedPayload(
        legacyActionsPayload as unknown as AttachmentRequestV2
      );
      expect(result).toEqual({
        type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
        attachmentId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
        owner: SECURITY_SOLUTION_OWNER,
        data: expectedUnifiedData,
        metadata: expectedUnifiedMetadata,
      });
    });

    it('toUnifiedPayload throws for non-legacy payloads', () => {
      expect(() =>
        actionsAttachmentTransformer.toUnifiedPayload(
          unifiedEndpointPayload as unknown as AttachmentRequestV2
        )
      ).toThrow('Expected legacy actions attachment payload');
    });

    it('toUnifiedPayload throws for a legacy actions payload with empty targets', () => {
      expect(() =>
        actionsAttachmentTransformer.toUnifiedPayload({
          ...legacyActionsPayload,
          actions: { type: 'isolate', targets: [] },
        } as unknown as AttachmentRequestV2)
      ).toThrow('Legacy actions payload has no targets to migrate');
    });

    it('toUnifiedPayload preserves a non-security owner verbatim (owner-agnostic)', () => {
      const result = actionsAttachmentTransformer.toUnifiedPayload({
        ...legacyActionsPayload,
        owner: 'observability',
      } as unknown as AttachmentRequestV2);
      expect((result as { owner: string }).owner).toBe('observability');
    });

    it('isLegacyPayload detects only legacy actions payloads', () => {
      expect(
        actionsAttachmentTransformer.isLegacyPayload(
          legacyActionsPayload as unknown as AttachmentRequestV2
        )
      ).toBe(true);
      expect(
        actionsAttachmentTransformer.isLegacyPayload(
          unifiedEndpointPayload as unknown as AttachmentRequestV2
        )
      ).toBe(false);
    });

    it('isUnifiedPayload is always false', () => {
      expect(
        actionsAttachmentTransformer.isUnifiedPayload(
          unifiedEndpointPayload as unknown as AttachmentRequestV2
        )
      ).toBe(false);
    });

    it('toLegacyPayload projects a unified security.endpoint payload back to externalReference and merges data.content into the comment', () => {
      const result = actionsAttachmentTransformer.toLegacyPayload(
        unifiedEndpointPayload as unknown as AttachmentRequestV2
      );
      expect(result).toMatchObject({
        type: AttachmentType.externalReference,
        externalReferenceAttachmentTypeId: 'endpoint',
        externalReferenceId: LEGACY_ACTIONS_SYNTHETIC_ATTACHMENT_ID,
        externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
        externalReferenceMetadata: expectedLegacyExternalReferenceMetadata,
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    it('toLegacyPayload throws an actions-specific error for legacy actions payloads (never re-emits the deprecated shape)', () => {
      expect(() =>
        actionsAttachmentTransformer.toLegacyPayload(
          legacyActionsPayload as unknown as AttachmentRequestV2
        )
      ).toThrow(
        'actionsAttachmentTransformer never re-emits the deprecated `actions` payload shape'
      );
    });
  });
});
