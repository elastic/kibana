/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  UnifiedReferenceAttachmentPayload,
  UnifiedAttachmentPayload,
  AttachmentAttributesV2,
} from '../../../common/types/domain/attachment/v2';
import type {
  ExternalReferenceAttachmentPayload,
  ExternalReferenceNoSOAttachmentPayload,
} from '../../../common/types/domain';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import { extractCommonAttributes } from './base';
import {
  EXTERNAL_REFERENCE_TYPE_MAP,
  UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP,
} from '../../../common/constants/attachments';
import { getExternalReferenceStorage } from './storage_type';

type ExternalReferenceStorage = ExternalReferenceAttachmentPayload['externalReferenceStorage'];

type LegacyMetadata = ExternalReferenceNoSOAttachmentPayload['externalReferenceMetadata'];

type UnifiedMetadata = UnifiedReferenceAttachmentPayload['metadata'];

/**
 * Forward pass for the legacy externalReference → unified projection. Folds:
 *   - `externalReferenceStorage.soType` (savedObject storage) into `metadata.soType`
 *   - `externalReferenceMetadata.comment` into `data.content`
 *
 * Returns `data` and `metadata` already shaped for the unified attachment. Any
 * residual legacy metadata keys are preserved on `metadata`; an empty residual
 * collapses to `undefined` so the unified attachment stays tidy.
 *
 * NOTE: the comment-lift fires for every subtype in `EXTERNAL_REFERENCE_TYPE_MAP`,
 * not just `endpoint`. Today it is only meaningful for endpoint (and for legacy
 * `actions` rows that project to it). Future subtypes whose `metadata.comment`
 * is not an analyst comment must add a per-type guard here before being added
 * to the map, otherwise their `comment` field will silently land in `data.content`
 * and be rejected by their unified zod schema.
 */
function liftLegacyAttributesToUnified(
  externalReferenceStorage: ExternalReferenceStorage | undefined,
  externalReferenceMetadata: LegacyMetadata
): {
  data?: { content: string };
  metadata: UnifiedMetadata | undefined;
} {
  const metadataBag: Record<string, unknown> = { ...(externalReferenceMetadata ?? {}) };

  let data: { content: string } | undefined;
  if (typeof metadataBag.comment === 'string') {
    data = { content: metadataBag.comment as string };
    delete metadataBag.comment;
  }

  if (externalReferenceStorage?.type === ExternalReferenceStorageType.savedObject) {
    metadataBag.soType = externalReferenceStorage.soType;
  }

  const metadata =
    Object.keys(metadataBag).length > 0 ? (metadataBag as unknown as UnifiedMetadata) : undefined;
  return { data, metadata };
}

/**
 * Inverse pass for unified → legacy externalReference. Folds:
 *   - unified `data.content` back into `externalReferenceMetadata.comment`
 *   - unified `metadata.soType` back into `externalReferenceStorage.savedObject.soType`
 *
 * When the unified attachment has no `metadata.soType`, falls back to the
 * registry's default storage shape for `legacyTypeId`.
 */
function lowerUnifiedAttributesToLegacy(
  unifiedAttrs: Pick<UnifiedReferenceAttachmentPayload, 'data' | 'metadata'>,
  legacyTypeId: string
): {
  externalReferenceStorage: ExternalReferenceStorage;
  externalReferenceMetadata: LegacyMetadata;
} {
  const metadataBag: Record<string, unknown> = { ...(unifiedAttrs.metadata ?? {}) };

  let externalReferenceStorage: ExternalReferenceStorage;
  if (typeof metadataBag.soType === 'string') {
    externalReferenceStorage = {
      type: ExternalReferenceStorageType.savedObject,
      soType: metadataBag.soType as string,
    };
    delete metadataBag.soType;
  } else {
    externalReferenceStorage = getExternalReferenceStorage(legacyTypeId);
  }

  if (unifiedAttrs.data != null && typeof unifiedAttrs.data.content === 'string') {
    metadataBag.comment = unifiedAttrs.data.content;
  }

  const externalReferenceMetadata =
    Object.keys(metadataBag).length > 0 ? (metadataBag as unknown as LegacyMetadata) : null;

  return { externalReferenceStorage, externalReferenceMetadata };
}

/**
 * Resolves a legacy externalReferenceAttachmentTypeId to its unified type name.
 * Returns undefined if the subtype is not mapped (not yet migrated).
 */
function resolveUnifiedType(externalReferenceAttachmentTypeId: string): string | undefined {
  return EXTERNAL_REFERENCE_TYPE_MAP[externalReferenceAttachmentTypeId];
}

/**
 * Resolves a unified type name back to the legacy externalReferenceAttachmentTypeId.
 */
function resolveLegacyTypeId(unifiedType: string): string | undefined {
  return UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP[unifiedType];
}

function isLegacyExternalReferenceAttachment(attributes: unknown): boolean {
  if (typeof attributes !== 'object' || attributes === null) return false;
  const attrs = attributes as Record<string, unknown>;
  if (attrs.type !== AttachmentType.externalReference) return false;
  const typeId = attrs.externalReferenceAttachmentTypeId;
  return typeof typeId === 'string' && resolveUnifiedType(typeId) != null;
}

function isUnifiedExternalReferenceAttachment(attributes: unknown): boolean {
  if (typeof attributes !== 'object' || attributes === null) return false;
  const attrs = attributes as Record<string, unknown>;
  // Reject array `attachmentId` (allowed by the shared v2 union for alert/event
  // types but invalid for external-reference subtypes).
  return (
    typeof attrs.type === 'string' &&
    resolveLegacyTypeId(attrs.type) != null &&
    typeof attrs.attachmentId === 'string'
  );
}

/**
 * Generic transformer for external reference attachments (legacy externalReference schema <-> unified schema).
 *
 * Legacy: { type: 'externalReference', externalReferenceId, externalReferenceStorage,
 *           externalReferenceAttachmentTypeId, externalReferenceMetadata }
 * Unified: { type: '<solution>.<subtype>', attachmentId, data?, metadata? }
 *
 * The mapping from externalReferenceAttachmentTypeId to unified type name is driven by
 * EXTERNAL_REFERENCE_TYPE_MAP in common/constants/attachments.ts. Add new entries there
 * as more external reference subtypes are migrated.
 */
export const externalReferenceAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    if (isUnifiedExternalReferenceAttachment(attributes)) {
      return attributes as UnifiedAttachmentAttributes;
    }

    if (isLegacyExternalReferenceAttachment(attributes)) {
      const legacyAttrs = attributes as AttachmentPersistedAttributes &
        ExternalReferenceNoSOAttachmentPayload & {
          externalReferenceStorage?: ExternalReferenceStorage;
        };
      const unifiedType =
        resolveUnifiedType(legacyAttrs.externalReferenceAttachmentTypeId) ??
        legacyAttrs.externalReferenceAttachmentTypeId;
      const { data, metadata } = liftLegacyAttributesToUnified(
        legacyAttrs.externalReferenceStorage,
        legacyAttrs.externalReferenceMetadata
      );
      return {
        type: unifiedType,
        attachmentId: legacyAttrs.externalReferenceId,
        ...(data ? { data } : {}),
        metadata,
        owner: legacyAttrs.owner,
        ...extractCommonAttributes(legacyAttrs as AttachmentAttributesV2),
      } as UnifiedAttachmentAttributes;
    }

    return attributes as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    if (isLegacyExternalReferenceAttachment(attributes)) {
      return attributes as AttachmentPersistedAttributes;
    }

    if (isUnifiedExternalReferenceAttachment(attributes)) {
      const unifiedAttrs = attributes as UnifiedAttachmentAttributes &
        UnifiedReferenceAttachmentPayload;
      const legacyTypeId = resolveLegacyTypeId(unifiedAttrs.type) ?? unifiedAttrs.type;
      const { externalReferenceStorage, externalReferenceMetadata } =
        lowerUnifiedAttributesToLegacy(unifiedAttrs, legacyTypeId);
      return {
        type: AttachmentType.externalReference,
        externalReferenceId: unifiedAttrs.attachmentId,
        externalReferenceStorage,
        externalReferenceAttachmentTypeId: legacyTypeId,
        externalReferenceMetadata,
        owner: unifiedAttrs.owner,
        ...extractCommonAttributes(unifiedAttrs as AttachmentAttributesV2),
      } as AttachmentPersistedAttributes;
    }

    return attributes as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return (
      isLegacyExternalReferenceAttachment(attributes) ||
      isUnifiedExternalReferenceAttachment(attributes)
    );
  },

  isUnifiedType(attributes: unknown): boolean {
    return isUnifiedExternalReferenceAttachment(attributes);
  },

  isLegacyType(attributes: unknown): boolean {
    return isLegacyExternalReferenceAttachment(attributes);
  },

  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return isLegacyExternalReferenceAttachment(attachment);
  },

  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return isUnifiedExternalReferenceAttachment(attachment);
  },

  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload {
    if (!isLegacyExternalReferenceAttachment(attachment)) {
      throw new Error('Expected legacy external reference attachment payload');
    }
    const legacyAttachment = attachment as ExternalReferenceNoSOAttachmentPayload & {
      externalReferenceStorage?: ExternalReferenceStorage;
    };
    const unifiedType =
      resolveUnifiedType(legacyAttachment.externalReferenceAttachmentTypeId) ??
      legacyAttachment.externalReferenceAttachmentTypeId;
    const { data, metadata } = liftLegacyAttributesToUnified(
      legacyAttachment.externalReferenceStorage,
      legacyAttachment.externalReferenceMetadata
    );
    return {
      type: unifiedType,
      attachmentId: legacyAttachment.externalReferenceId,
      ...(data ? { data } : {}),
      metadata,
      owner: legacyAttachment.owner,
    };
  },

  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    if (!isUnifiedExternalReferenceAttachment(attachment)) {
      throw new Error('Expected unified external reference attachment payload');
    }
    const unifiedAttachment = attachment as UnifiedReferenceAttachmentPayload;
    const legacyTypeId = resolveLegacyTypeId(unifiedAttachment.type) ?? unifiedAttachment.type;
    const { externalReferenceStorage, externalReferenceMetadata } = lowerUnifiedAttributesToLegacy(
      unifiedAttachment,
      legacyTypeId
    );
    return {
      type: AttachmentType.externalReference,
      externalReferenceId: unifiedAttachment.attachmentId,
      externalReferenceStorage,
      externalReferenceAttachmentTypeId: legacyTypeId,
      externalReferenceMetadata,
      owner: unifiedAttachment.owner,
    } as ExternalReferenceNoSOAttachmentPayload;
  },
};
