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
  EXTERNAL_REFERENCE_TYPE_MAP,
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
import { externalReferenceAttachmentTransformer } from './external_reference';
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
 * for legacy `externalReference` attachments with a migrated subtype this resolves to the unified
 * type name (e.g., externalReference + typeId 'endpoint' → 'security.endpoint');
 * for all other shapes it is the top-level `type` (e.g. `user`, `alert`, unified `lens`).
 * Use `toUnifiedAttachmentType` / `toUnifiedPersistableStateAttachmentType` from migration utils to normalize.
 * @throws Error if attributes is null or not an object
 */
export function getAttachmentTypeFromAttributes(attributes: unknown): string {
  if (attributes === null || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: expected non-null object');
  }
  const { type, persistableStateAttachmentTypeId, externalReferenceAttachmentTypeId } =
    attributes as Record<string, unknown>;
  if (typeof type !== 'string') {
    throw new Error('Invalid attributes: missing attachment type');
  }
  if (
    type === AttachmentType.persistableState &&
    typeof persistableStateAttachmentTypeId === 'string'
  ) {
    return persistableStateAttachmentTypeId;
  }
  // For legacy external references, resolve to unified type if the subtype is migrated
  if (
    type === AttachmentType.externalReference &&
    typeof externalReferenceAttachmentTypeId === 'string'
  ) {
    return EXTERNAL_REFERENCE_TYPE_MAP[externalReferenceAttachmentTypeId] ?? type;
  }
  return type;
}

/** Set of all unified type names that map to external references */
const UNIFIED_EXTERNAL_REFERENCE_TYPES = new Set(Object.values(EXTERNAL_REFERENCE_TYPE_MAP));

/**
 * Returns the persisted transformer for the routing key from {@link getAttachmentTypeFromAttributes}.
 * For comment/user types returns the comment transformer; for migrated persistable
 * types (e.g. Lens) returns the persistable-state transformer; for migrated external
 * reference subtypes (e.g. endpoint) returns the external reference transformer;
 * otherwise pass-through.
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
  if (UNIFIED_EXTERNAL_REFERENCE_TYPES.has(normalizedType)) {
    return externalReferenceAttachmentTransformer;
  }
  return passThroughTransformer;
}
