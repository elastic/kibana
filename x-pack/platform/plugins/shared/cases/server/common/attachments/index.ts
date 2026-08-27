/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
  PERSISTABLE_ATTACHMENT_TYPES,
  EXTERNAL_REFERENCE_TYPE_MAP,
  LEGACY_ACTIONS_TYPE,
} from '../../../common/constants/attachments';
import {
  getAttachmentTypeFromAttributes,
  isAlertAttachmentType,
  isUnifiedAttachmentRequest,
  toUnifiedAttachmentType,
  toUnifiedPersistableStateAttachmentType,
} from '../../../common/utils/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type {
  AttachmentPatchRequestV2,
  AttachmentRequestV2,
  AttachmentsFindResponseV2,
} from '../../../common/types/api';
import { AttachmentPatchRequestRt, AttachmentRequestRt } from '../../../common/types/api';
import type { Case } from '../../../common/types/domain';
import type {
  AttachmentAttributesV2,
  AttachmentV2,
  UnifiedAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import { decodeWithExcessOrThrow } from '../runtime_types';
import { isUnifiedOnlyAttachment } from '../../services/type_guards';
import { passThroughTransformer, type AttachmentTypeTransformer } from './base';
import { commentAttachmentTransformer } from './comment';
import { externalReferenceAttachmentTransformer } from './external_reference';
import { persistableStateAttachmentTransformer } from './persistable_state';
import { eventAttachmentTransformer } from './event';
import { actionsAttachmentTransformer } from './actions';
import { alertAttachmentTransformer } from './alert';

export { getCommentContentFromUnifiedPayload, commentAttachmentTransformer } from './comment';
export { actionsAttachmentTransformer } from './actions';
export {
  getAttachmentSavedObjectType,
  resolveAttachmentSavedObjectTypes,
} from './saved_object_type';
export type { ResolvedAttachmentSavedObjectType } from './saved_object_type';
// Re-exported so existing server call sites keep their `from '.'` import path.
export { getAttachmentTypeFromAttributes } from '../../../common/utils/attachments';

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
  if (type === LEGACY_ACTIONS_TYPE) {
    return actionsAttachmentTransformer;
  }
  if (isAlertAttachmentType(normalizedType)) {
    return alertAttachmentTransformer;
  }
  if (UNIFIED_EXTERNAL_REFERENCE_TYPES.has(normalizedType)) {
    return externalReferenceAttachmentTransformer;
  }
  return passThroughTransformer;
}

// --- Public API boundary: unified request in, legacy response out ---
//
// The per-type transformers above convert a single attachment. Everything
// below is a thin batch/container wrapper around them, used only where a
// public route still owes callers the v1 wire shape.

/**
 * Converts an already-validated v1 (or unified) attachment payload to unified.
 * Checks v1 alert id/index pairing here so callers can convert before the
 * client without dropping that 400.
 */
export const toUnifiedAttachmentPayload = (
  attachment: AttachmentRequestV2
): UnifiedAttachmentPayload => {
  if (isUnifiedAttachmentRequest(attachment)) {
    return attachment;
  }

  // `isUnifiedOnlyAttachment` isn't a type predicate (it takes the wider
  // pre-decode attributes shape), so this branch still needs the cast.
  if (isUnifiedOnlyAttachment(attachment)) {
    return attachment as unknown as UnifiedAttachmentPayload;
  }

  if ('alertId' in attachment && 'index' in attachment) {
    const ids = Array.isArray(attachment.alertId) ? attachment.alertId : [attachment.alertId];
    const indices = Array.isArray(attachment.index) ? attachment.index : [attachment.index];
    if (ids.length !== indices.length) {
      throw Boom.badRequest(
        `Received an alert comment with ids and indices arrays of different lengths ids: ${JSON.stringify(
          ids
        )} indices: ${JSON.stringify(indices)}`
      );
    }
  }

  const attachmentType = getAttachmentTypeFromAttributes(attachment);
  const transformer = getAttachmentTypeTransformers(attachmentType, attachment.owner);

  if (transformer.isUnifiedPayload(attachment)) {
    return attachment;
  }

  return transformer.toUnifiedPayload(attachment);
};

export const toUnifiedAttachmentPatchPayload = (
  patch: AttachmentPatchRequestV2
): UnifiedAttachmentPayload & { id: string; version: string } => {
  const { id, version, ...rest } = patch;
  return {
    id,
    version,
    ...toUnifiedAttachmentPayload(rest as AttachmentRequestV2),
  };
};

/** Public `/comments` POST body: decode the v1 shape, then convert to unified. */
export const toUnifiedAttachmentRequest = (body: unknown): UnifiedAttachmentPayload =>
  toUnifiedAttachmentPayload(decodeWithExcessOrThrow(AttachmentRequestRt)(body));

/** Public `/comments` PATCH body: decode the v1 shape, then convert to unified. */
export const toUnifiedAttachmentPatchRequest = (
  body: unknown
): UnifiedAttachmentPayload & { id: string; version: string } =>
  toUnifiedAttachmentPatchPayload(decodeWithExcessOrThrow(AttachmentPatchRequestRt)(body));

/**
 * Rebuilds the v1 wire attributes for a hybrid attachment. Unified-only
 * attachments (entity, timeline, dashboard, map, discoverSession, lens-by-ref)
 * have no v1 form and are returned unchanged.
 */
export const toLegacyAttachmentAttributes = (
  attributes: AttachmentAttributesV2
): AttachmentAttributesV2 => {
  if (isUnifiedOnlyAttachment(attributes)) {
    return attributes;
  }

  const attachmentType = getAttachmentTypeFromAttributes(attributes);
  const owner = attributes.owner ?? '';
  const transformer = getAttachmentTypeTransformers(attachmentType, owner);
  return transformer.toLegacySchema(attributes) as AttachmentAttributesV2;
};

export const toLegacyAttachmentResponse = (attachment: AttachmentV2): AttachmentV2 => {
  const { id, version, ...attributes } = attachment;
  return {
    id,
    version,
    ...toLegacyAttachmentAttributes(attributes as AttachmentAttributesV2),
  };
};

const toLegacyAttachmentsResponse = (attachments: AttachmentV2[]): AttachmentV2[] =>
  attachments.map(toLegacyAttachmentResponse);

export const toLegacyCaseResponse = (theCase: Case): Case => {
  if (theCase.comments == null) {
    return theCase;
  }

  return {
    ...theCase,
    comments: toLegacyAttachmentsResponse(theCase.comments),
  };
};

export const toLegacyFindResponse = (
  response: AttachmentsFindResponseV2
): AttachmentsFindResponseV2 => ({
  ...response,
  comments: toLegacyAttachmentsResponse(response.comments),
});
