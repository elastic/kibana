/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
  PERSISTABLE_ATTACHMENT_TYPES,
} from '../../../common/constants/attachments';
import {
  toUnifiedAttachmentType,
  toUnifiedPersistableStateAttachmentType,
} from '../../../common/utils/attachments';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { passThroughTransformer, type AttachmentTypeTransformer } from './base';
import { commentAttachmentTransformer } from './comment';
import { persistableStateAttachmentTransformer } from './persistable_state';
import { eventAttachmentTransformer } from './event';

export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export {
  getAttachmentSavedObjectType,
  resolveAttachmentSavedObjectType,
} from './saved_object_type';

/**
 * Returns a routing key for transformer selection (not necessarily a normalized unified type).
 * For legacy `persistableState` attachments this is `persistableStateAttachmentTypeId` (e.g. `.lens`);
 * for all other shapes it is the top-level `type` (e.g. `user`, `alert`, unified `lens`).
 * Use `toUnifiedAttachmentType` / `toUnifiedPersistableStateAttachmentType` from migration utils to normalize.
 * @throws Error if attributes is null or not an object
 */
export function getAttachmentTypeFromAttributes(attributes: unknown): string {
  if (attributes === null || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: expected non-null object');
  }
  const { type, persistableStateAttachmentTypeId } = attributes as Record<string, unknown>;
  if (typeof type !== 'string') {
    throw new Error('Invalid attributes: missing attachment type');
  }
  if (
    type === AttachmentType.persistableState &&
    typeof persistableStateAttachmentTypeId === 'string'
  ) {
    return persistableStateAttachmentTypeId;
  }
  return type;
}

/**
 * Returns the persisted transformer for the routing key from {@link getAttachmentTypeFromAttributes}.
 * For comment/user types returns the comment transformer; for migrated persistable
 * types (e.g. Lens) returns the persistable-state transformer; otherwise pass-through.
 */
export function getAttachmentTypeTransformers(
  type: string,
  owner: string
): AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes> {
  const normalizedType = toUnifiedAttachmentType(type, owner);
  const normalizedPersistableType = toUnifiedPersistableStateAttachmentType(type);

  if (normalizedType === COMMENT_ATTACHMENT_TYPE || normalizedType === 'comment') {
    return commentAttachmentTransformer;
  }
  if (PERSISTABLE_ATTACHMENT_TYPES.has(normalizedPersistableType)) {
    return persistableStateAttachmentTransformer;
  }
  if (normalizedType === SECURITY_EVENT_ATTACHMENT_TYPE) {
    return eventAttachmentTransformer;
  }
  return passThroughTransformer;
}
