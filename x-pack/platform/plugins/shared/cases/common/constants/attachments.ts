/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER, GENERAL_CASES_OWNER } from './owners';

// ----------------Unified attachment types-------------------------
export const COMMENT_ATTACHMENT_TYPE = 'comment';
export const SECURITY_EVENT_ATTACHMENT_TYPE = 'security.event';

// ----------------Legacy attachment types-------------------------
export const LEGACY_ACTIONS_TYPE = 'actions';
export const LEGACY_ALERT_TYPE = 'alert';
export const LEGACY_EVENT_TYPE = 'event';
export const LEGACY_EXTERNAL_REFERENCE_TYPE = 'externalReference';
export const LEGACY_PERSISTABLE_STATE_TYPE = 'persistableState';
export const LEGACY_USER_TYPE = 'user';

export const LEGACY_ATTACHMENT_TYPES = new Set([
  LEGACY_ACTIONS_TYPE,
  LEGACY_ALERT_TYPE,
  LEGACY_EVENT_TYPE,
  LEGACY_EXTERNAL_REFERENCE_TYPE,
  LEGACY_PERSISTABLE_STATE_TYPE,
  LEGACY_USER_TYPE,
]);

export const UNIFIED_ATTACHMENT_TYPES = new Set([
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
]);

/**
 * Mapping from legacy attachment type names to unified names.
 */
export const LEGACY_TO_UNIFIED_MAP: Record<string, string> = {
  [LEGACY_USER_TYPE]: COMMENT_ATTACHMENT_TYPE,
} as const;

/**
 * Reverse mapping from unified names to legacy names.
 */
export const UNIFIED_TO_LEGACY_MAP: Record<string, string> = {
  [COMMENT_ATTACHMENT_TYPE]: LEGACY_USER_TYPE,
  [SECURITY_EVENT_ATTACHMENT_TYPE]: LEGACY_EVENT_TYPE,
} as const;

/**
 * Attachment type identifiers that are migrated to unified read/write behavior.
 */
export const MIGRATED_ATTACHMENT_TYPES = new Set<string>([
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
]);

export const OWNER_TO_PREFIX_MAP: Partial<Record<string, string>> = {
  [SECURITY_SOLUTION_OWNER]: 'security',
  [OBSERVABILITY_OWNER]: 'observability',
  [GENERAL_CASES_OWNER]: 'stack',
};

export const PREFIX_TO_OWNER_MAP: Partial<Record<string, string>> = {
  security: SECURITY_SOLUTION_OWNER,
  observability: OBSERVABILITY_OWNER,
  stack: GENERAL_CASES_OWNER,
};
