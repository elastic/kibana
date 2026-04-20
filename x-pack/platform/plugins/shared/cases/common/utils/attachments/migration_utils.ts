/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LEGACY_TO_UNIFIED_MAP,
  MIGRATED_ATTACHMENT_TYPES,
  PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP,
  PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP,
  PERSISTABLE_ATTACHMENT_TYPES,
  UNIFIED_TO_LEGACY_MAP,
  OWNER_TO_PREFIX_MAP,
  LEGACY_EVENT_TYPE,
} from '../../constants/attachments';

export const isMigratedAttachmentType = (type: string, owner: string): boolean => {
  return (
    MIGRATED_ATTACHMENT_TYPES.has(toUnifiedAttachmentType(type, owner)) ||
    MIGRATED_ATTACHMENT_TYPES.has(toUnifiedPersistableStateAttachmentType(type))
  );
};

export const toLegacyAttachmentType = (type?: string): string | undefined => {
  if (typeof type !== 'string') {
    return undefined;
  }
  if (type in PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP) {
    return toLegacyPersistableStateAttachmentType(type);
  }
  return UNIFIED_TO_LEGACY_MAP[type] ?? type;
};

export const toUnifiedAttachmentType = (type: string, owner: string): string => {
  if (type === LEGACY_EVENT_TYPE) {
    const ownerPrefix = OWNER_TO_PREFIX_MAP[owner];
    if (ownerPrefix == null) {
      return type;
    }
    return `${ownerPrefix}.event`;
  }
  return LEGACY_TO_UNIFIED_MAP[type] ?? type;
};

/**
 * True when the persistable-state subtype id (legacy `.lens` or unified `lens`) is one
 * that this stack migrates to unified attachment attributes (currently Lens only).
 */
export const isPersistableType = (type: string): boolean =>
  PERSISTABLE_ATTACHMENT_TYPES.has(toUnifiedPersistableStateAttachmentType(type));

export const toUnifiedPersistableStateAttachmentType = (type: string): string => {
  return PERSISTABLE_STATE_LEGACY_TO_UNIFIED_MAP[type] ?? type;
};

export const toLegacyPersistableStateAttachmentType = (type: string): string => {
  return PERSISTABLE_STATE_UNIFIED_TO_LEGACY_MAP[type] ?? type;
};
