/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { passThroughTransformer } from '../../../common/attachments/base';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { AttachmentPersistedAttributes } from '../../../common/types/attachments_v1';
import type { UnifiedAttachmentAttributes } from '../../../common/types/attachments_v2';
import {
  type AttachmentPatchAttributesV2,
  type AttachmentMode,
  UnifiedAttachmentAttributesRt,
} from '../../../../common/types/domain/attachment/v2';
import { isMigratedAttachmentType } from '../../../../common/utils/attachments';
import {
  getAttachmentTypeFromAttributes,
  getAttachmentTypeTransformers,
} from '../../../common/attachments';
import { isUnifiedOnlyAttachment } from '../../type_guards';

export type ModeTransformedAttributes =
  | { isUnified: true; attributes: UnifiedAttachmentAttributes }
  | { isUnified: false; attributes: AttachmentPersistedAttributes };

export function transformAttributesForMode({
  attributes,
  mode,
}: {
  attributes:
    | UnifiedAttachmentAttributes
    | AttachmentPersistedAttributes
    | AttachmentPatchAttributesV2;
  mode: AttachmentMode;
}): ModeTransformedAttributes {
  const attachmentType = getAttachmentTypeFromAttributes(attributes);
  const owner = attributes?.owner ?? '';
  const transformer = getAttachmentTypeTransformers(attachmentType, owner);
  // Unified-only attachments (no legacy counterpart, e.g. entity/timeline or a
  // Lens-by-reference instance) cannot be represented in the legacy schema and
  // must stay in unified mode even when a legacy read is requested.
  const isUnifiedOnly = isUnifiedOnlyAttachment(attributes);

  if ((mode === 'unified' || isUnifiedOnly) && isMigratedAttachmentType(attachmentType, owner)) {
    const unifiedAttrs = transformer.toUnifiedSchema(attributes);
    const validatedAttributes = decodeOrThrow(UnifiedAttachmentAttributesRt)(unifiedAttrs);
    return { isUnified: true, attributes: validatedAttributes };
  }

  const legacyAttrs = transformer.toLegacySchema(attributes);
  return { isUnified: false, attributes: legacyAttrs };
}

/**
 * Guards the legacy comment-SO write paths (`create`/`bulkCreate`/`update`/
 * `bulkUpdate`). Unified-only attachments (no legacy counterpart) cannot be
 * represented in the legacy schema, so persisting them as a
 * `CASE_COMMENT_SAVED_OBJECT` fails deep in the response decode step with an
 * opaque 500. This surfaces an actionable 400 instead, pointing operators at the
 * required Kibana config.
 *
 * Two flavours are rejected:
 *  - unified-only *types* (e.g. `security.entity`/`security.timeline`), reachable
 *    on a misconfiguration where the type's own feature flag is on while
 *    `xpack.cases.attachments.enabled` is off, and
 *  - unified-only *instances* of hybrid types — a Lens-by-reference attachment
 *    has no by-value legacy form even though by-value Lens does.
 */
export const assertLegacyWriteableAttachmentType = (
  attributes:
    | UnifiedAttachmentAttributes
    | AttachmentPersistedAttributes
    | AttachmentPatchAttributesV2
): void => {
  if (isUnifiedOnlyAttachment(attributes)) {
    const type = getAttachmentTypeFromAttributes(attributes);
    throw Boom.badRequest(
      `Attachment type '${type}' has no legacy representation and requires the unified attachment SO type. Enable xpack.cases.attachments.enabled in your Kibana configuration.`
    );
  }
};

export function getTransformerForPatchAttributes(
  decodedAttributes: AttachmentPatchAttributesV2,
  requestWithoutType: boolean
) {
  if (requestWithoutType) {
    return passThroughTransformer;
  }

  if (!decodedAttributes.owner) {
    throw new Error('Invalid attributes: expected owner when transforming attachment patch');
  }

  return getAttachmentTypeTransformers(
    getAttachmentTypeFromAttributes(decodedAttributes),
    decodedAttributes.owner
  );
}
