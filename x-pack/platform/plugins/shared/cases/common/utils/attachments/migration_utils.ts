/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMENT_ATTACHMENT_TYPE,
  EVENT_ATTACHMENT_TYPE,
  LEGACY_TO_UNIFIED_MAP,
  MIGRATED_ATTACHMENT_TYPES,
  UNIFIED_TO_LEGACY_MAP,
} from '../../constants/attachments';

export const isMigratedAttachmentType = (type?: string): boolean => {
  if (typeof type !== 'string') {
    return false;
  }
  return MIGRATED_ATTACHMENT_TYPES.has(type);
};

export const toLegacyAttachmentType = (type?: string): string | undefined => {
  if (typeof type !== 'string') {
    return undefined;
  }
  return UNIFIED_TO_LEGACY_MAP[type] ?? type;
};

export const toUnifiedAttachmentType = (type: string): string => {
  return LEGACY_TO_UNIFIED_MAP[type] ?? type;
};

export const isCommentAttachmentType = (type?: string): boolean =>
  typeof type === 'string' && toUnifiedAttachmentType(type) === COMMENT_ATTACHMENT_TYPE;

export const isEventAttachmentType = (type?: string): boolean =>
  typeof type === 'string' && toUnifiedAttachmentType(type) === EVENT_ATTACHMENT_TYPE;
