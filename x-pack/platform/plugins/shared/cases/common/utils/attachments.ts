/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest } from '../types/api';
import type {
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
  UnifiedAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '../types/domain';
import { AttachmentType } from '../types/domain';
import {
  VALID_ATTACHMENT_TYPES,
  LEGACY_TO_UNIFIED_MAP,
  UNIFIED_TO_LEGACY_MAP,
} from '../constants/attachments';

/**
 * A type narrowing function for external reference attachments.
 */
export const isCommentRequestTypeExternalReference = (
  context: AttachmentRequest | UnifiedAttachmentPayload
): context is ExternalReferenceAttachmentPayload => {
  return context.type === AttachmentType.externalReference;
};

/**
 * A type narrowing function for persistable state attachments.
 */
export const isCommentRequestTypePersistableState = (
  context: Partial<AttachmentRequest> | UnifiedAttachmentPayload
): context is PersistableStateAttachmentPayload => {
  return context.type === AttachmentType.persistableState;
};

export const isLegacyCommentRequest = (
  context: AttachmentRequest | UnifiedAttachmentPayload
): context is AttachmentRequest => {
  return Object.values(AttachmentType).includes(context.type as AttachmentType);
};
/**
 * A type narrowing function for  reference-based unified attachment.
 */
export const isUnifiedReferenceAttachmentRequest = (
  context: AttachmentRequest | UnifiedAttachmentPayload
): context is UnifiedReferenceAttachmentPayload => {
  return 'attachmentId' in context && typeof context.attachmentId === 'string';
};

/**
 * A type narrowing function for value-based unified attachment.
 */
export const isUnifiedValueAttachmentRequest = (
  context: AttachmentRequest | UnifiedAttachmentPayload
): context is UnifiedValueAttachmentPayload => {
  return 'data' in context && context.data !== null && typeof context.data === 'object';
};

/**
 * A type narrowing function for unified attachment (either reference or value-based).
 */
export const isUnifiedAttachmentRequest = (
  context: AttachmentRequest | UnifiedAttachmentPayload
): context is UnifiedAttachmentPayload => {
  return isUnifiedReferenceAttachmentRequest(context) || isUnifiedValueAttachmentRequest(context);
};

/**
 * Converts a legacy attachment type to its unified type
 */
export function toUnifiedAttachmentType(type: string): string {
  if (!VALID_ATTACHMENT_TYPES.has(type)) {
    throw new Error(`Invalid attachment type: ${type}`);
  }

  const unified = LEGACY_TO_UNIFIED_MAP[type];
  if (unified) {
    return unified;
  }
  // If already unified or not migrated, return as-is
  return type;
}

/**
 * Converts a unified attachment type to its legacy form
 */
export function toLegacyAttachmentType(type: string): string {
  if (!VALID_ATTACHMENT_TYPES.has(type)) {
    throw new Error(`Invalid attachment type: ${type}`);
  }

  const legacy = UNIFIED_TO_LEGACY_MAP[type];
  if (legacy) {
    return legacy;
  }
  // If no legacy form exists, return as-is
  return type;
}
