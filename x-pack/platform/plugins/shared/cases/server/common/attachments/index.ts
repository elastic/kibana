/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toUnifiedAttachmentType } from '../../../common/utils/attachments';
import {
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { passThroughTransformer, type AttachmentTypeTransformer } from './base';
import { commentAttachmentTransformer } from './comment';
import { eventAttachmentTransformer } from './event';

export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export {
  getAttachmentSavedObjectType,
  resolveAttachmentSavedObjectType,
} from './saved_object_type';

/**
 * Returns the attachment type string from attributes (unified or legacy shape).
 * Used to select the correct transformer.
 * @throws Error if attributes is null or not an object
 */
export function getAttachmentTypeFromAttributes(attributes: unknown): string {
  if (attributes === null || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: expected non-null object');
  }
  const { type } = attributes as Record<string, unknown>;
  if (typeof type !== 'string') {
    throw new Error('Invalid attributes: missing attachment type');
  }
  return type;
}

/**
 * Returns the persisted transformer for the given attachment type.
 * Use getAttachmentTypeFromAttributes(attributes) to derive type from decoded attributes.
 * For comment/user types returns the comment transformer; for all other types returns a
 * pass-through transformer (identity for old <-> new schema).
 */
export function getAttachmentTypeTransformers(
  type: string,
  owner: string
): AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes> {
  const normalizedType = toUnifiedAttachmentType(type, owner);

  if (normalizedType === COMMENT_ATTACHMENT_TYPE || normalizedType === 'comment') {
    return commentAttachmentTransformer;
  }
  if (normalizedType === SECURITY_EVENT_ATTACHMENT_TYPE) {
    return eventAttachmentTransformer;
  }
  return passThroughTransformer;
}
