/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Single source of truth for attachment type strings.
// Used by AttachmentType enum (v1) and attachment utilities.
// Avoids circular dependency: constants -> types/domain -> attachment/v1 -> constants
export const LEGACY_ATTACHMENT_ACTIONS = 'actions';
export const LEGACY_ATTACHMENT_ALERT = 'alert';
export const LEGACY_ATTACHMENT_EVENT = 'event';
export const LEGACY_ATTACHMENT_EXTERNAL_REFERENCE = 'externalReference';
export const LEGACY_ATTACHMENT_PERSISTABLE_STATE = 'persistableState';
export const LEGACY_ATTACHMENT_USER = 'user';

// ----------------Unified attachment types-------------------------
export const COMMENT_ATTACHMENT_TYPE = 'comment';
export const EVENT_ATTACHMENT_TYPE = 'securityEvent';

export const LEGACY_ATTACHMENT_TYPES = new Set([
  LEGACY_ATTACHMENT_ACTIONS,
  LEGACY_ATTACHMENT_ALERT,
  LEGACY_ATTACHMENT_EVENT,
  LEGACY_ATTACHMENT_EXTERNAL_REFERENCE,
  LEGACY_ATTACHMENT_PERSISTABLE_STATE,
  LEGACY_ATTACHMENT_USER,
]);

export const UNIFIED_ATTACHMENT_TYPES = new Set([COMMENT_ATTACHMENT_TYPE, EVENT_ATTACHMENT_TYPE]);

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
  [LEGACY_ATTACHMENT_USER]: COMMENT_ATTACHMENT_TYPE,
  [LEGACY_ATTACHMENT_EVENT]: EVENT_ATTACHMENT_TYPE,
} as const;

/**
 * Reverse mapping from unified names to legacy names.
 */
export const UNIFIED_TO_LEGACY_MAP: Record<string, string> = {
  [COMMENT_ATTACHMENT_TYPE]: LEGACY_ATTACHMENT_USER,
  [EVENT_ATTACHMENT_TYPE]: LEGACY_ATTACHMENT_EVENT,
} as const;

/**
 * Attachment type identifiers that are migrated to unified read/write behavior.
 * Include both legacy and unified names while migration is in progress.
 */
export const MIGRATED_ATTACHMENT_TYPES = new Set<string>([
  LEGACY_ATTACHMENT_USER,
  COMMENT_ATTACHMENT_TYPE,
  LEGACY_ATTACHMENT_EVENT,
  EVENT_ATTACHMENT_TYPE,
]);
