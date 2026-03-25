/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AttachmentType } from '../types/domain';

// ----------------Unified attachment types-------------------------
export const COMMENT_ATTACHMENT_TYPE = 'comment';

export const LEGACY_ATTACHMENT_TYPES = new Set([
  AttachmentType.actions,
  AttachmentType.alert,
  AttachmentType.event,
  AttachmentType.externalReference,
  AttachmentType.persistableState,
  AttachmentType.user,
]);

export const UNIFIED_ATTACHMENT_TYPES = new Set([COMMENT_ATTACHMENT_TYPE]);

/**
 * Mapping from legacy attachment type names to unified names.
 */
export const LEGACY_TO_UNIFIED_MAP: Record<string, string> = {
  [AttachmentType.user]: COMMENT_ATTACHMENT_TYPE,
} as const;

/**
 * Reverse mapping from unified names to legacy names.
 */
export const UNIFIED_TO_LEGACY_MAP: Record<string, string> = {
  [COMMENT_ATTACHMENT_TYPE]: AttachmentType.user,
} as const;

/**
 * Attachment type identifiers that are migrated to unified read/write behavior.
 * Include both legacy and unified names while migration is in progress.
 */
export const MIGRATED_ATTACHMENT_TYPES = new Set<string>([COMMENT_ATTACHMENT_TYPE]);
