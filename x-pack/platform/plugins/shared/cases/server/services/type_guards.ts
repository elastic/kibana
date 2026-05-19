/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { ExternalReferenceSOAttachmentPayload } from '../../common/types/domain';
import { AttachmentType, ExternalReferenceStorageType } from '../../common/types/domain';
import type { AttachmentAttributesV2 } from '../../common/types/domain/attachment/v2';
import { UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP } from '../../common/constants/attachments';
import type { AttachmentRequestAttributes } from '../common/types/attachments_v1';

/**
 * A type narrowing function for external reference saved object attachments.
 */
export const isCommentRequestTypeExternalReferenceSO = (
  context: Partial<AttachmentRequestAttributes>
): context is ExternalReferenceSOAttachmentPayload => {
  return (
    context.type === AttachmentType.externalReference &&
    context.externalReferenceStorage?.type === ExternalReferenceStorageType.savedObject
  );
};

/**
 * Narrows to a unified attachment backed by a saved object reference.
 *
 * Two gates: (1) the unified `type` is registered in the
 * legacy <-> unified storage map (only registered migrated SO-backed subtypes
 * qualify), and (2) `metadata.soType` is a non-empty string. Per-subtype zod
 * schemas additionally lock `soType` to a literal so a forged value cannot
 * pass write validation.
 *
 * Note: this is intentionally distinct from `isUnifiedReferenceAttachmentRequest`,
 * which also requires `attachmentId` to be present. This guard tolerates a
 * missing `attachmentId` because read paths inspect raw saved-object attributes
 * where `attachmentId` may live only in `references` (self-heal path).
 */
export const isUnifiedAttachmentWithSoReference = (
  context: Partial<AttachmentAttributesV2> | Record<string, unknown>
): context is {
  type: string;
  attachmentId?: string | string[];
  metadata: { soType: string } & Record<string, unknown>;
} & Record<string, unknown> => {
  const ctx = context as Record<string, unknown> | null | undefined;
  const type = ctx?.type;
  if (typeof type !== 'string' || UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP[type] == null) {
    return false;
  }
  const metadata = ctx?.metadata;
  return isPlainObject(metadata) && typeof (metadata as { soType?: unknown }).soType === 'string';
};
