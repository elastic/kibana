/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import { AttachmentType } from '../../../common/types/domain';
import {
  isPersistableType,
  toLegacyPersistableStateAttachmentType,
  toUnifiedPersistableStateAttachmentType,
} from '../../../common/utils/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

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

// ---- Request layer (API / DTO) ----
export function isLegacyPayloadPersistableStateAttachment(
  attachment: AttachmentRequestV2
): boolean {
  return (
    isLegacyPersistableState(attachment) &&
    isPersistableType(attachment.persistableStateAttachmentTypeId)
  );
}

export function isUnifiedPayloadPersistableStateAttachment(
  attachment: AttachmentRequestV2
): boolean {
  return (
    isRecord(attachment) &&
    typeof attachment.type === 'string' &&
    isPersistableType(attachment.type) &&
    isUnifiedValueAttachmentForType(attachment, attachment.type)
  );
}

export function toUnifiedPayloadPersistableStateAttachment(
  attachment: AttachmentRequestV2
): UnifiedAttachmentPayload {
  if (
    isLegacyPersistableState(attachment) &&
    isPersistableType(attachment.persistableStateAttachmentTypeId)
  ) {
    const unifiedTypeId = toUnifiedPersistableStateAttachmentType(
      attachment.persistableStateAttachmentTypeId
    );
    const legacyState = getStateFromLegacyAttachment(attachment);
    return {
      type: unifiedTypeId,
      owner: attachment.owner,
      data: { state: legacyState },
    } as UnifiedAttachmentPayload;
  }

  return attachment as unknown as UnifiedAttachmentPayload;
}

export function toLegacyPayloadPersistableStateAttachment(
  unifiedPayload: AttachmentRequestV2
): AttachmentRequest {
  if (isRecord(unifiedPayload) && typeof unifiedPayload.type === 'string') {
    if (
      !isPersistableType(unifiedPayload.type) ||
      !isUnifiedValueAttachmentForType(unifiedPayload, unifiedPayload.type)
    ) {
      return unifiedPayload as AttachmentRequest;
    }
    const legacyTypeId = toLegacyPersistableStateAttachmentType(unifiedPayload.type);
    const legacyState = getStateFromUnifiedData(unifiedPayload.data) ?? {};
    return {
      type: AttachmentType.persistableState,
      owner: unifiedPayload.owner,
      persistableStateAttachmentTypeId: legacyTypeId,
      persistableStateAttachmentState: legacyState,
    };
  }

  return unifiedPayload as AttachmentRequest;
}

// ---- Persisted layer (SO attributes) ----
function isNewSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    isRecord(attributes) &&
    typeof attributes.type === 'string' &&
    isPersistableType(attributes.type) &&
    isUnifiedValueAttachmentForType(attributes, attributes.type)
  );
}

function isOldSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    isLegacyPersistableState(attributes) &&
    isPersistableType(attributes.persistableStateAttachmentTypeId)
  );
}

/**
 * Transformer for migrated persistable visualization attachments (e.g. Lens): legacy
 * `persistableState` wrapper <-> unified value shape (`type` + `data.state`).
 */
export const persistableStateAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    const attrs = attributes as AttachmentAttributesV2;
    if (isNewSchema(attrs)) {
      return attrs as UnifiedAttachmentAttributes;
    }
    if (isOldSchema(attrs)) {
      const oldAttrs = attrs as AttachmentPersistedAttributes & {
        type: AttachmentType.persistableState;
        persistableStateAttachmentTypeId: string;
      };
      const unifiedTypeId = toUnifiedPersistableStateAttachmentType(
        oldAttrs.persistableStateAttachmentTypeId
      );
      const legacyState = getStateFromLegacyAttachment(oldAttrs);
      return {
        type: unifiedTypeId,
        owner: oldAttrs.owner,
        data: { state: legacyState },
        created_at: oldAttrs.created_at,
        created_by: oldAttrs.created_by,
        pushed_at: oldAttrs.pushed_at ?? null,
        pushed_by: oldAttrs.pushed_by ?? null,
        updated_at: oldAttrs.updated_at ?? null,
        updated_by: oldAttrs.updated_by ?? null,
      } as UnifiedAttachmentAttributes;
    }
    return attrs as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    const attrs = attributes as AttachmentPersistedAttributes | UnifiedAttachmentAttributes;
    const attrsAsCombined = attrs as AttachmentAttributesV2;

    if (isOldSchema(attrsAsCombined)) {
      return attrs as unknown as AttachmentPersistedAttributes;
    }

    if (isNewSchema(attrsAsCombined)) {
      const newAttrs = attrs as UnifiedAttachmentAttributes;
      const legacyTypeId = toLegacyPersistableStateAttachmentType(newAttrs.type);
      const legacyState = getStateFromUnifiedData(newAttrs.data as Record<string, unknown>) ?? {};
      return {
        type: AttachmentType.persistableState,
        owner: newAttrs.owner,
        persistableStateAttachmentTypeId: legacyTypeId,
        persistableStateAttachmentState: legacyState,
        created_at: newAttrs.created_at,
        created_by: newAttrs.created_by,
        pushed_at: newAttrs.pushed_at ?? null,
        pushed_by: newAttrs.pushed_by ?? null,
        updated_at: newAttrs.updated_at ?? null,
        updated_by: newAttrs.updated_by ?? null,
      };
    }

    return attrs as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isOldSchema(attributes) || isNewSchema(attributes);
  },

  isUnifiedType(attributes: AttachmentAttributesV2): boolean {
    return isNewSchema(attributes);
  },

  isLegacyType(attributes: AttachmentAttributesV2): boolean {
    return isOldSchema(attributes);
  },

  // --- Request payload (API layer) ---
  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return isLegacyPayloadPersistableStateAttachment(attachment);
  },

  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return isUnifiedPayloadPersistableStateAttachment(attachment);
  },

  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload {
    return toUnifiedPayloadPersistableStateAttachment(attachment);
  },

  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    return toLegacyPayloadPersistableStateAttachment(attachment);
  },
};
