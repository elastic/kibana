/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// NOTE: Do not import from '../types/domain' here to avoid circular dependencies
// (types/domain -> constants/index -> constants/attachments -> types/domain).
// Use string literals for legacy type names instead.

// ----------------Legacy attachment type names (string literals)---
const LEGACY_USER_TYPE = 'user';
const LEGACY_EXTERNAL_REFERENCE_TYPE = 'externalReference';

// ----------------Unified attachment types-------------------------
export const COMMENT_ATTACHMENT_TYPE = 'comment';
export const SECURITY_ENDPOINT_ATTACHMENT_TYPE = 'security.endpoint';

/**
 * Mapping from legacy externalReferenceAttachmentTypeId to unified type name.
 * Used by the generic externalReference transformer to resolve the unified type.
 */
export const EXTERNAL_REFERENCE_TYPE_MAP: Record<string, string> = {
  endpoint: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} as const;

export const LEGACY_ATTACHMENT_TYPES = new Set([
  'actions',
  'alert',
  'event',
  LEGACY_EXTERNAL_REFERENCE_TYPE,
  'persistableState',
  LEGACY_USER_TYPE,
]);

export const UNIFIED_ATTACHMENT_TYPES = new Set([
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
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
  [SECURITY_ENDPOINT_ATTACHMENT_TYPE]: LEGACY_EXTERNAL_REFERENCE_TYPE,
} as const;

/**
 * Reverse mapping from unified type name back to externalReferenceAttachmentTypeId.
 */
export const UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP: Record<string, string> = {
  [SECURITY_ENDPOINT_ATTACHMENT_TYPE]: 'endpoint',
} as const;

/**
 * Attachment type identifiers that are migrated to unified read/write behavior.
 * Include both legacy and unified names while migration is in progress.
 */
export const MIGRATED_ATTACHMENT_TYPES = new Set<string>([
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
]);
