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
import { AttachmentType } from '../../../common/types/domain';
import {
  LEGACY_LENS_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP,
  PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP,
} from '../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLegacyPersistableState = (
  value: unknown
): value is AttachmentPersistedAttributes & {
  type: AttachmentType.persistableState;
  persistableStateAttachmentTypeId: string;
} =>
  isRecord(value) &&
  value.type === AttachmentType.persistableState &&
  typeof value.owner === 'string' &&
  typeof value.persistableStateAttachmentTypeId === 'string';

const getStateFromLegacyAttachment = (
  attachment: AttachmentPersistedAttributes & {
    type: AttachmentType.persistableState;
    persistableStateAttachmentTypeId: string;
  }
): AttachmentPersistedAttributes['persistableStateAttachmentState'] => {
  if (isRecord(attachment.persistableStateAttachmentState)) {
    return attachment.persistableStateAttachmentState;
  }

  return {};
};

const isUnifiedValueAttachmentForType = (
  value: unknown,
  typeId: string
): value is UnifiedAttachmentAttributes & { data: { state?: Record<string, unknown> } } =>
  isRecord(value) &&
  value.type === typeId &&
  typeof value.owner === 'string' &&
  isRecord(value.data);

const getStateFromUnifiedData = (
  data: Record<string, unknown>
): AttachmentPersistedAttributes['persistableStateAttachmentState'] => {
  const state = data.state;
  if (isRecord(state)) {
    return state as AttachmentPersistedAttributes['persistableStateAttachmentState'];
  }

  return data as AttachmentPersistedAttributes['persistableStateAttachmentState'];
};

const getUnifiedTypeIdFromAny = (typeId: string): string | undefined => {
  if (typeId === LEGACY_LENS_ATTACHMENT_TYPE || typeId === LENS_ATTACHMENT_TYPE) {
    return LENS_ATTACHMENT_TYPE;
  }

  return PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP[typeId] ?? typeId;
};

const getLegacyTypeIdFromAny = (typeId: string): string | undefined => {
  if (typeId === LEGACY_LENS_ATTACHMENT_TYPE || typeId === LENS_ATTACHMENT_TYPE) {
    return LEGACY_LENS_ATTACHMENT_TYPE;
  }

  return PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP[typeId] ?? typeId;
};

const isSupportedPersistableStateTypeId = (typeId: string): boolean =>
  getUnifiedTypeIdFromAny(typeId) != null && getLegacyTypeIdFromAny(typeId) != null;

export const persistableStateAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return (
      isLegacyPersistableState(attachment) &&
      isSupportedPersistableStateTypeId(attachment.persistableStateAttachmentTypeId)
    );
  },

  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return (
      isRecord(attachment) &&
      typeof attachment.type === 'string' &&
      isSupportedPersistableStateTypeId(attachment.type) &&
      isUnifiedValueAttachmentForType(attachment, attachment.type)
    );
  },

  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload {
    if (isLegacyPersistableState(attachment)) {
      const unifiedTypeId = getUnifiedTypeIdFromAny(attachment.persistableStateAttachmentTypeId);
      if (unifiedTypeId == null) {
        return attachment as UnifiedAttachmentPayload;
      }
      const legacyState = getStateFromLegacyAttachment(attachment);
      return {
        type: unifiedTypeId,
        owner: attachment.owner,
        data: { state: legacyState },
      } as UnifiedAttachmentPayload;
    }

    return attachment as UnifiedAttachmentPayload;
  },

  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    if (isRecord(attachment) && typeof attachment.type === 'string') {
      const legacyTypeId = getLegacyTypeIdFromAny(attachment.type);
      if (legacyTypeId == null || !isUnifiedValueAttachmentForType(attachment, attachment.type)) {
        return attachment as AttachmentRequest;
      }
      const legacyState = getStateFromUnifiedData(attachment.data) ?? {};
      return {
        type: AttachmentType.persistableState,
        owner: attachment.owner,
        persistableStateAttachmentTypeId: legacyTypeId,
        persistableStateAttachmentState: legacyState,
      };
    }

    return attachment as AttachmentRequest;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return this.isLegacyType(attributes) || this.isUnifiedType(attributes);
  },

  isUnifiedType(attributes: unknown): boolean {
    return (
      isRecord(attributes) &&
      typeof attributes.type === 'string' &&
      isSupportedPersistableStateTypeId(attributes.type) &&
      isUnifiedValueAttachmentForType(attributes, attributes.type)
    );
  },

  isLegacyType(attributes: unknown): boolean {
    return (
      isLegacyPersistableState(attributes) &&
      isSupportedPersistableStateTypeId(attributes.persistableStateAttachmentTypeId)
    );
  },

  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    if (
      isRecord(attributes) &&
      typeof attributes.type === 'string' &&
      isSupportedPersistableStateTypeId(attributes.type) &&
      isUnifiedValueAttachmentForType(attributes, attributes.type)
    ) {
      return attributes;
    }

    if (isLegacyPersistableState(attributes)) {
      const unifiedTypeId = getUnifiedTypeIdFromAny(attributes.persistableStateAttachmentTypeId);
      if (unifiedTypeId == null) {
        return attributes as unknown as UnifiedAttachmentAttributes;
      }
      const legacyState = getStateFromLegacyAttachment(attributes);
      return {
        type: unifiedTypeId,
        owner: attributes.owner,
        data: { state: legacyState },
        created_at: attributes.created_at,
        created_by: attributes.created_by,
        pushed_at: attributes.pushed_at ?? null,
        pushed_by: attributes.pushed_by ?? null,
        updated_at: attributes.updated_at ?? null,
        updated_by: attributes.updated_by ?? null,
      } as UnifiedAttachmentAttributes;
    }

    return attributes as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    if (
      isLegacyPersistableState(attributes) &&
      isSupportedPersistableStateTypeId(attributes.persistableStateAttachmentTypeId)
    ) {
      return attributes as unknown as AttachmentPersistedAttributes;
    }

    if (isRecord(attributes) && typeof attributes.type === 'string') {
      const legacyTypeId = getLegacyTypeIdFromAny(attributes.type);
      if (legacyTypeId == null || !isUnifiedValueAttachmentForType(attributes, attributes.type)) {
        return attributes as unknown as AttachmentPersistedAttributes;
      }
      const legacyState = getStateFromUnifiedData(attributes.data) ?? {};
      return {
        type: AttachmentType.persistableState,
        owner: attributes.owner,
        persistableStateAttachmentTypeId: legacyTypeId,
        persistableStateAttachmentState: legacyState,
        created_at: attributes.created_at,
        created_by: attributes.created_by,
        pushed_at: attributes.pushed_at ?? null,
        pushed_by: attributes.pushed_by ?? null,
        updated_at: attributes.updated_at ?? null,
        updated_by: attributes.updated_by ?? null,
      };
    }

    return attributes as AttachmentPersistedAttributes;
  },
};
