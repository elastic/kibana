/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  if (mode === 'unified' && isMigratedAttachmentType(attachmentType, owner)) {
    const unifiedAttrs = transformer.toUnifiedSchema(attributes);
    const validatedAttributes = decodeOrThrow(UnifiedAttachmentAttributesRt)(unifiedAttrs);
    return { isUnified: true, attributes: validatedAttributes };
  }

  const legacyAttrs = transformer.toLegacySchema(attributes);
  return { isUnified: false, attributes: legacyAttrs };
}

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
