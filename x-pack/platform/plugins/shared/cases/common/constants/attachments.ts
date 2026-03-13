/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// ----------------Unified attachment types-------------------------
export const COMMENT_ATTACHMENT_TYPE = 'comment';
export const LEGACY_ACTIONS_ATTACHMENT_TYPE = 'actions';
export const LEGACY_ALERT_ATTACHMENT_TYPE = 'alert';
export const LEGACY_EVENT_ATTACHMENT_TYPE = 'event';
export const LEGACY_EXTERNAL_REFERENCE_ATTACHMENT_TYPE = 'externalReference';
export const LEGACY_PERSISTABLE_STATE_ATTACHMENT_TYPE = 'persistableState';
export const LEGACY_COMMENT_ATTACHMENT_TYPE = 'user';

export const LEGACY_ATTACHMENT_TYPES = new Set([
  LEGACY_ACTIONS_ATTACHMENT_TYPE,
  LEGACY_ALERT_ATTACHMENT_TYPE,
  LEGACY_EVENT_ATTACHMENT_TYPE,
  LEGACY_EXTERNAL_REFERENCE_ATTACHMENT_TYPE,
  LEGACY_PERSISTABLE_STATE_ATTACHMENT_TYPE,
  LEGACY_COMMENT_ATTACHMENT_TYPE,
]);

export const UNIFIED_ATTACHMENT_TYPES = new Set([COMMENT_ATTACHMENT_TYPE]);

/**
 * Valid attachment types (legacy and unified).
 */
export const VALID_ATTACHMENT_TYPES = new Set([
  ...LEGACY_ATTACHMENT_TYPES,
  ...UNIFIED_ATTACHMENT_TYPES,
]);

/**
 * Mapping from legacy attachment type names to unified names.
 */
export const LEGACY_TO_UNIFIED_MAP: Record<string, string> = {
  [LEGACY_COMMENT_ATTACHMENT_TYPE]: COMMENT_ATTACHMENT_TYPE,
} as const;

/**
 * Reverse mapping from unified names to legacy names.
 */
export const UNIFIED_TO_LEGACY_MAP: Record<string, string> = {
  [COMMENT_ATTACHMENT_TYPE]: LEGACY_COMMENT_ATTACHMENT_TYPE,
} as const;

/**
 * Attachment type identifiers that are migrated to unified read/write behavior.
 * Include both legacy and unified names while migration is in progress.
 */
export const MIGRATED_ATTACHMENT_TYPES = new Set<string>([
  LEGACY_COMMENT_ATTACHMENT_TYPE,
  COMMENT_ATTACHMENT_TYPE,
]);
