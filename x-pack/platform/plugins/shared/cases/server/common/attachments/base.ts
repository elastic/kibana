/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentPayload,
} from '../../../common/types/domain';
import type {
  CommonAttributes,
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { AttachmentType } from '../../../common/types/domain';

/**
 * Base interface for attachment type transformers.
 * Covers both request payload (API layer) and persisted attributes (SO layer).
 */
export interface AttachmentTypeTransformer<TOld = unknown, TNew = unknown> {
  // --- Request payload (API layer) ---
  isLegacyPayload(attachment: AttachmentRequestV2): boolean;
  isUnifiedPayload(attachment: AttachmentRequestV2): boolean;
  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload;
  toLegacyPayload(attachment: AttachmentRequestV2, owner?: string): AttachmentRequest;

  // --- Persisted attributes (SO layer) ---
  isType(attributes: AttachmentAttributesV2): boolean;
  isUnifiedType(attributes: unknown): boolean;
  isLegacyType(attributes: unknown): boolean;
  toUnifiedSchema(attributes: unknown): TNew;
  toLegacySchema(attributes: unknown, owner?: string): TOld;
}

export const passThroughTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return (
      typeof attachment === 'object' &&
      attachment !== null &&
      'type' in attachment &&
      Object.values(AttachmentType).includes(
        (attachment as { type: string }).type as AttachmentType
      )
    );
  },
  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return (
      typeof attachment === 'object' &&
      attachment !== null &&
      (('data' in attachment && (attachment as { data: unknown }).data != null) ||
        ('attachmentId' in attachment &&
          typeof (attachment as { attachmentId: unknown }).attachmentId === 'string'))
    );
  },
  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload {
    return attachment as UnifiedAttachmentPayload;
  },
  toLegacyPayload(attachment: AttachmentRequestV2, _owner?: string): AttachmentRequest {
    return attachment as AttachmentRequest;
  },
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    return attributes as UnifiedAttachmentAttributes;
  },
  toLegacySchema(attributes: unknown, _owner?: string): AttachmentPersistedAttributes {
    return attributes as AttachmentPersistedAttributes;
  },
  isType(_attributes: AttachmentAttributesV2): boolean {
    return false;
  },
  isUnifiedType(_attributes: unknown): boolean {
    return false;
  },
  isLegacyType(_attributes: unknown): boolean {
    return false;
  },
};

/**
 * Extracts common attributes from either old or new schema.
 */
export function extractCommonAttributes(attributes: AttachmentAttributesV2): CommonAttributes {
  const createdBy = attributes.created_by;
  const pushedBy = attributes.pushed_by;
  const updatedBy = attributes.updated_by;

  return {
    created_at: attributes.created_at,
    created_by: {
      username: createdBy.username || '',
      full_name: createdBy.full_name,
      email: createdBy.email,
      profile_uid: createdBy.profile_uid,
    },
    pushed_at: attributes.pushed_at ?? null,
    pushed_by: pushedBy
      ? {
          username: pushedBy.username || '',
          full_name: pushedBy.full_name,
          email: pushedBy.email,
          profile_uid: pushedBy.profile_uid,
        }
      : null,
    updated_at: attributes.updated_at ?? null,
    updated_by: updatedBy
      ? {
          username: updatedBy.username || '',
          full_name: updatedBy.full_name,
          email: updatedBy.email,
          profile_uid: updatedBy.profile_uid,
        }
      : null,
  };
}
