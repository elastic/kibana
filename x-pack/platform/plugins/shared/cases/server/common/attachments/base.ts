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
import type { User } from '../types/user';
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
  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest;

  // --- Persisted attributes (SO layer) ---
  isType(attributes: AttachmentAttributesV2): boolean;
  isUnifiedType(attributes: unknown): boolean;
  isLegacyType(attributes: unknown): boolean;
  toUnifiedSchema(attributes: unknown): TNew;
  toLegacySchema(attributes: unknown): TOld;
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
  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    return attachment as AttachmentRequest;
  },
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    return attributes as UnifiedAttachmentAttributes;
  },
  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
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

const normalizeUser = (user: User): User => ({
  username: user.username || '',
  full_name: user.full_name,
  email: user.email,
  profile_uid: user.profile_uid,
});

/**
 * Extracts common attributes from either old or new schema, emitting only the
 * fields present on the input. PATCH payloads omit `created_*`/`pushed_*`, so a
 * full projection would both throw and clobber stored values on a partial update.
 */
export function extractCommonAttributes(
  attributes: Partial<AttachmentAttributesV2>
): Partial<CommonAttributes> {
  const result: Partial<CommonAttributes> = {};

  if (attributes.created_at !== undefined) {
    result.created_at = attributes.created_at;
  }
  if (attributes.created_by !== undefined) {
    result.created_by = normalizeUser(attributes.created_by);
  }
  if (attributes.pushed_at !== undefined) {
    result.pushed_at = attributes.pushed_at ?? null;
  }
  if (attributes.pushed_by !== undefined) {
    result.pushed_by = attributes.pushed_by ? normalizeUser(attributes.pushed_by) : null;
  }
  if (attributes.updated_at !== undefined) {
    result.updated_at = attributes.updated_at ?? null;
  }
  if (attributes.updated_by !== undefined) {
    result.updated_by = attributes.updated_by ? normalizeUser(attributes.updated_by) : null;
  }

  return result;
}
