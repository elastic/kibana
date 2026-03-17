/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../common/types/domain';
import {
  COMMENT_ATTACHMENT_TYPE,
  VALID_ATTACHMENT_TYPES,
  LEGACY_TO_UNIFIED_MAP,
} from '../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { passThroughTransformer, type AttachmentTypeTransformer } from './base';
import { commentAttachmentTransformer } from './comment';

export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export {
  getAttachmentSavedObjectType,
  resolveAttachmentSavedObjectType,
} from './saved_object_type';

/**
 * Converts a legacy attachment type to its unified type.
 */
export function toUnifiedAttachmentType(type: string): string {
  if (!VALID_ATTACHMENT_TYPES.has(type)) {
    throw new Error(`Invalid attachment type: ${type}`);
  }
  const unified = LEGACY_TO_UNIFIED_MAP[type];
  if (unified) {
    return unified;
  }
  return type;
}

/**
 * Returns the attachment type string from attributes (unified or legacy shape).
 * Used to select the correct transformer.
 * @throws Error if attributes is null or not an object
 */
export function getAttachmentTypeFromAttributes(attributes: unknown): string {
  if (attributes === null || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: expected non-null object');
  }
  const attrs = attributes as Record<string, unknown>;
  if (typeof attrs.type === 'string') {
    return attrs.type;
  }
  if ('comment' in attrs) {
    return AttachmentType.user;
  }
  return COMMENT_ATTACHMENT_TYPE;
}

/**
 * Returns the persisted transformer for the given attachment type.
 * Use getAttachmentTypeFromAttributes(attributes) to derive type from decoded attributes.
 * For comment/user types returns the comment transformer; for all other types returns a
 * pass-through transformer (identity for old <-> new schema).
 */
export function getAttachmentTypeTransformers(
  type: string
): AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes> {
  const normalizedType = toUnifiedAttachmentType(type);

  if (normalizedType === 'comment') {
    return commentAttachmentTransformer;
  }
  return passThroughTransformer;
}
