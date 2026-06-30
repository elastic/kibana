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
