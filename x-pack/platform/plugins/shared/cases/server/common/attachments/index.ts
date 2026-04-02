/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMENT_ATTACHMENT_TYPE,
  EXTERNAL_REFERENCE_TYPE_MAP,
} from '../../../common/constants/attachments';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { passThroughTransformer, type AttachmentTypeTransformer } from './base';
import { commentAttachmentTransformer } from './comment';
import { externalReferenceAttachmentTransformer } from './external_reference';

export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export {
  getAttachmentSavedObjectType,
  resolveAttachmentSavedObjectType,
} from './saved_object_type';

/**
 * Returns the attachment type string from attributes (unified or legacy shape).
 * For legacy external references with a migrated subtype, resolves to the unified type name
 * (e.g., externalReference + typeId 'endpoint' → 'security.endpoint').
 * @throws Error if attributes is null or not an object
 */
export function getAttachmentTypeFromAttributes(attributes: unknown): string {
  if (attributes === null || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: expected non-null object');
  }
  const { type, externalReferenceAttachmentTypeId } = attributes as Record<string, unknown>;
  if (typeof type !== 'string') {
    throw new Error('Invalid attributes: missing attachment type');
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
 * Returns the persisted transformer for the given attachment type.
 * Use getAttachmentTypeFromAttributes(attributes) to derive type from decoded attributes.
 */
export function getAttachmentTypeTransformers(
  type: string
): AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes> {
  const normalizedType = toUnifiedAttachmentType(type);

  if (normalizedType === COMMENT_ATTACHMENT_TYPE) {
    return commentAttachmentTransformer;
  }
  if (UNIFIED_EXTERNAL_REFERENCE_TYPES.has(normalizedType)) {
    return externalReferenceAttachmentTransformer;
  }
  return passThroughTransformer;
}
