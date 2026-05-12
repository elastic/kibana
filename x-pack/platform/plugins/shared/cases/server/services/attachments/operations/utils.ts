/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
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

/**
 * Structurally identifies a unified payload: top-level `data` (value arm) or
 * `attachmentId` (reference arm), and none of the V1 type-specific markers.
 * Used to avoid V1-decoding born-unified attachments (dashboard, map,
 * discoverSession, lens SO-ref) whose transformer either doesn't claim them
 * (passThrough) or doesn't have a legacy mapping for the specific arm
 * (persistable transformer + lens SO-ref).
 */
const V1_DISTINGUISHING_FIELDS = [
  'comment',
  'alertId',
  'eventId',
  'actions',
  'persistableStateAttachmentTypeId',
  'externalReferenceAttachmentTypeId',
] as const;

function looksUnified(attributes: unknown): boolean {
  if (!isPlainObject(attributes)) return false;
  const attrs = attributes as Record<string, unknown>;
  if (V1_DISTINGUISHING_FIELDS.some((k) => k in attrs)) return false;
  return 'data' in attrs || 'attachmentId' in attrs;
}

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

  // If the picked transformer didn't actually downgrade to a V1 shape — true
  // for born-unified types via passThrough, and for hybrid arms the routed
  // transformer doesn't recognize (e.g. lens SO-ref via persistable) — fall
  // through to unified so the caller doesn't try to V1-decode it.
  if (transformer === passThroughTransformer || looksUnified(legacyAttrs)) {
    const unifiedAttrs = transformer.toUnifiedSchema(attributes);
    const validatedAttributes = decodeOrThrow(UnifiedAttachmentAttributesRt)(unifiedAttrs);
    return { isUnified: true, attributes: validatedAttributes };
  }

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
