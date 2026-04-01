/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { passThroughTransformer, type AttachmentTypeTransformer } from './base';
import { commentAttachmentTransformer } from './comment';
import { endpointAttachmentTransformer } from './endpoint';

const ENDPOINT_ATTACHMENT_TYPE_ID = 'endpoint';

export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export {
  getAttachmentSavedObjectType,
  resolveAttachmentSavedObjectType,
} from './saved_object_type';

/**
 * Returns the attachment type string from attributes (unified or legacy shape).
 * For legacy external references, returns the more specific `externalReferenceAttachmentTypeId`
 * so transformer routing can correctly identify the attachment subtype.
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
  // For legacy external references, use the specific type ID for transformer routing
  if (
    type === AttachmentType.externalReference &&
    typeof externalReferenceAttachmentTypeId === 'string'
  ) {
    return externalReferenceAttachmentTypeId;
  }
  return type;
}

/**
 * Returns the persisted transformer for the given attachment type.
 * Use getAttachmentTypeFromAttributes(attributes) to derive type from decoded attributes.
 * For comment/user types returns the comment transformer; for endpoint types returns
 * the endpoint transformer; for all other types returns a pass-through transformer.
 */
export function getAttachmentTypeTransformers(
  type: string
): AttachmentTypeTransformer<AttachmentPersistedAttributes, UnifiedAttachmentAttributes> {
  const normalizedType = toUnifiedAttachmentType(type);

  if (normalizedType === COMMENT_ATTACHMENT_TYPE) {
    return commentAttachmentTransformer;
  }
  if (normalizedType === ENDPOINT_ATTACHMENT_TYPE_ID) {
    return endpointAttachmentTransformer;
  }
  return passThroughTransformer;
}
