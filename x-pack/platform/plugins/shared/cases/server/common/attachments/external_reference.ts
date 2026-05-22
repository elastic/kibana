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

/** Lifts `externalReferenceStorage.soType` into `metadata.soType` (savedObject storage only). */
function liftLegacySoTypeIntoMetadata(
  externalReferenceStorage: ExternalReferenceStorage | undefined,
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (externalReferenceStorage?.type !== ExternalReferenceStorageType.savedObject) {
    return metadata;
  }
  return {
    ...(metadata ?? {}),
    soType: externalReferenceStorage.soType,
  };
}

/** Inverse of {@link liftLegacySoTypeIntoMetadata}. */
function lowerSoTypeIntoLegacyStorage(
  metadata: Record<string, unknown> | null | undefined,
  legacyTypeId: string
): {
  externalReferenceStorage: ExternalReferenceStorage;
  metadata: Record<string, unknown> | null | undefined;
} {
  const soType = metadata && typeof metadata.soType === 'string' ? metadata.soType : undefined;
  if (soType != null) {
    const { soType: _stripped, ...rest } = metadata as Record<string, unknown>;
    const cleanedMetadata = Object.keys(rest).length > 0 ? rest : null;
    return {
      externalReferenceStorage: { type: ExternalReferenceStorageType.savedObject, soType },
      metadata: cleanedMetadata,
    };
  }
  return {
    externalReferenceStorage: getExternalReferenceStorage(legacyTypeId),
    metadata: metadata ?? null,
  };
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
 * Unified: { type: '<solution>.<subtype>', attachmentId, metadata }
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
      const liftedMetadata = liftLegacySoTypeIntoMetadata(
        legacyAttrs.externalReferenceStorage,
        legacyAttrs.externalReferenceMetadata as Record<string, unknown> | null | undefined
      );
      return {
        type: unifiedType,
        attachmentId: legacyAttrs.externalReferenceId,
        metadata: liftedMetadata,
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
      const { externalReferenceStorage, metadata } = lowerSoTypeIntoLegacyStorage(
        unifiedAttrs.metadata as Record<string, unknown> | null | undefined,
        legacyTypeId
      );
      return {
        type: AttachmentType.externalReference,
        externalReferenceId: unifiedAttrs.attachmentId,
        externalReferenceStorage,
        externalReferenceAttachmentTypeId: legacyTypeId,
        externalReferenceMetadata: metadata,
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
    const liftedMetadata = liftLegacySoTypeIntoMetadata(
      legacyAttachment.externalReferenceStorage,
      legacyAttachment.externalReferenceMetadata as Record<string, unknown> | null | undefined
    );
    return {
      type: unifiedType,
      attachmentId: legacyAttachment.externalReferenceId,
      metadata: liftedMetadata as UnifiedReferenceAttachmentPayload['metadata'],
      owner: legacyAttachment.owner,
    };
  },

  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    if (!isUnifiedExternalReferenceAttachment(attachment)) {
      throw new Error('Expected unified external reference attachment payload');
    }
    const unifiedAttachment = attachment as UnifiedReferenceAttachmentPayload;
    const legacyTypeId = resolveLegacyTypeId(unifiedAttachment.type) ?? unifiedAttachment.type;
    const { externalReferenceStorage, metadata } = lowerSoTypeIntoLegacyStorage(
      unifiedAttachment.metadata as Record<string, unknown> | null | undefined,
      legacyTypeId
    );
    return {
      type: AttachmentType.externalReference,
      externalReferenceId: unifiedAttachment.attachmentId,
      externalReferenceStorage,
      externalReferenceAttachmentTypeId: legacyTypeId,
      externalReferenceMetadata: metadata,
      owner: unifiedAttachment.owner,
    } as ExternalReferenceNoSOAttachmentPayload;
  },
};
