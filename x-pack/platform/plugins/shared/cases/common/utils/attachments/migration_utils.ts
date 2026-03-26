/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LEGACY_TO_UNIFIED_MAP,
  MIGRATED_ATTACHMENT_TYPES,
  UNIFIED_TO_LEGACY_MAP,
} from '../../constants/attachments';
import { AttachmentType } from '../../types/domain';

export const isMigratedAttachmentType = (type: string): boolean => {
  return MIGRATED_ATTACHMENT_TYPES.has(toUnifiedAttachmentType(type));
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
  toLegacyAttachmentType(type) === AttachmentType.user;
