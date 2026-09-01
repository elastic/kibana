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
import type { AttachmentRequestAttributes } from '../common/types/attachments_v1';
import {
  getAttachmentTypeFromAttributes,
  isUnifiedOnlyAttachmentType,
} from '../../common/utils/attachments';
import { UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP } from '../../common/constants/attachments';

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
 * `metadata.soType` is the SO-backed marker. It's trusted because per-subtype
 * zod schemas lock it to a literal on write; new SO-backed types just need
 * such a schema, no server allowlist required.
 *
 * Unlike `isUnifiedReferenceAttachmentRequest`, this tolerates a missing
 * `attachmentId` since read paths may find it only in `references` (self-heal).
 */
export const isUnifiedAttachmentWithSoReference = (
  context: Partial<AttachmentAttributesV2> | Record<string, unknown>
): context is {
  type: string;
  attachmentId?: string | string[];
  metadata: { soType: string } & Record<string, unknown>;
} & Record<string, unknown> => {
  const ctx = context as Record<string, unknown> | null | undefined;
  if (typeof ctx?.type !== 'string') {
    return false;
  }
  const metadata = ctx?.metadata;
  return isPlainObject(metadata) && typeof (metadata as { soType?: unknown }).soType === 'string';
};

/**
 * True when an attachment *instance* has no legacy (v1) representation and must be
 * persisted/returned in the unified schema. Combines:
 *  - unified-only *types* (e.g. entity/timeline/dashboard) via `isUnifiedOnlyAttachmentType`, and
 *  - unified-only *instances* of hybrid types: a Lens-by-reference attachment has no
 *    by-value legacy counterpart even though by-value Lens does.
 *
 * The SO-reference branch is scoped to types without a legacy externalReference form:
 * `file`/`endpoint`/`osquery`/`indicator` are SO-backed but map cleanly onto legacy
 * externalReference, so their by-reference instances are legacy-writeable.
 */
export const isUnifiedOnlyAttachment = (
  attributes: Partial<AttachmentAttributesV2> | Record<string, unknown>
): boolean => {
  let type: string;
  try {
    type = getAttachmentTypeFromAttributes(attributes);
  } catch {
    // Type can't be resolved (e.g. a malformed request missing `type`). Such payloads
    // are rejected downstream with a 400, so they are not unified-only here — this runs
    // on the raw request body before decode, so it must not throw.
    return false;
  }
  const owner = (attributes as { owner?: string }).owner ?? '';
  if (isUnifiedOnlyAttachmentType(type, owner)) {
    return true;
  }
  return (
    isUnifiedAttachmentWithSoReference(attributes) &&
    !(type in UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP)
  );
};
