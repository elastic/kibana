/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  UnifiedReferenceAttachmentPayload,
  UnifiedAttachmentPayload,
  AttachmentAttributesV2,
} from '../../../common/types/domain/attachment/v2';
import type { ExternalReferenceNoSOAttachmentPayload } from '../../../common/types/domain';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import { extractCommonAttributes } from './base';

const ENDPOINT_ATTACHMENT_TYPE_ID = 'endpoint';

function isLegacyEndpointAttachment(attributes: unknown): boolean {
  if (typeof attributes !== 'object' || attributes === null) return false;
  const attrs = attributes as Record<string, unknown>;
  return (
    attrs.type === AttachmentType.externalReference &&
    attrs.externalReferenceAttachmentTypeId === ENDPOINT_ATTACHMENT_TYPE_ID
  );
}

function isUnifiedEndpointAttachment(attributes: unknown): boolean {
  if (typeof attributes !== 'object' || attributes === null) return false;
  const attrs = attributes as Record<string, unknown>;
  return attrs.type === ENDPOINT_ATTACHMENT_TYPE_ID && 'attachmentId' in attrs;
}

/**
 * Transformer for endpoint attachments (legacy externalReference schema <-> unified schema).
 *
 * Legacy: { type: 'externalReference', externalReferenceId, externalReferenceStorage,
 *           externalReferenceAttachmentTypeId: 'endpoint', externalReferenceMetadata: { targets, command, comment } }
 * Unified: { type: 'endpoint', attachmentId, metadata: { targets, command, comment } }
 */
export const endpointAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    if (isUnifiedEndpointAttachment(attributes)) {
      return attributes as UnifiedAttachmentAttributes;
    }

    if (isLegacyEndpointAttachment(attributes)) {
      const legacyAttrs = attributes as AttachmentPersistedAttributes &
        ExternalReferenceNoSOAttachmentPayload;
      return {
        type: ENDPOINT_ATTACHMENT_TYPE_ID,
        attachmentId: legacyAttrs.externalReferenceId,
        metadata: legacyAttrs.externalReferenceMetadata as Record<string, unknown> | undefined,
        owner: legacyAttrs.owner,
        ...extractCommonAttributes(legacyAttrs as unknown as AttachmentAttributesV2),
      } as UnifiedAttachmentAttributes;
    }

    return attributes as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    if (isLegacyEndpointAttachment(attributes)) {
      return attributes as AttachmentPersistedAttributes;
    }

    if (isUnifiedEndpointAttachment(attributes)) {
      const unifiedAttrs = attributes as UnifiedAttachmentAttributes &
        UnifiedReferenceAttachmentPayload;
      return {
        type: AttachmentType.externalReference,
        externalReferenceId: unifiedAttrs.attachmentId,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.elasticSearchDoc,
        },
        externalReferenceAttachmentTypeId: ENDPOINT_ATTACHMENT_TYPE_ID,
        externalReferenceMetadata: unifiedAttrs.metadata as Record<string, unknown> | null,
        owner: unifiedAttrs.owner,
        ...extractCommonAttributes(unifiedAttrs as unknown as AttachmentAttributesV2),
      } as AttachmentPersistedAttributes;
    }

    return attributes as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyEndpointAttachment(attributes) || isUnifiedEndpointAttachment(attributes);
  },

  isUnifiedType(attributes: unknown): boolean {
    return isUnifiedEndpointAttachment(attributes);
  },

  isLegacyType(attributes: unknown): boolean {
    return isLegacyEndpointAttachment(attributes);
  },

  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return isLegacyEndpointAttachment(attachment);
  },

  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return isUnifiedEndpointAttachment(attachment);
  },

  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedAttachmentPayload {
    const legacyAttachment = attachment as ExternalReferenceNoSOAttachmentPayload;
    return {
      type: ENDPOINT_ATTACHMENT_TYPE_ID,
      attachmentId: legacyAttachment.externalReferenceId,
      metadata: legacyAttachment.externalReferenceMetadata,
      owner: legacyAttachment.owner,
    };
  },

  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    const unifiedAttachment = attachment as UnifiedReferenceAttachmentPayload;
    return {
      type: AttachmentType.externalReference,
      externalReferenceId: unifiedAttachment.attachmentId,
      externalReferenceStorage: {
        type: ExternalReferenceStorageType.elasticSearchDoc,
      },
      externalReferenceAttachmentTypeId: ENDPOINT_ATTACHMENT_TYPE_ID,
      externalReferenceMetadata: unifiedAttachment.metadata ?? null,
      owner: unifiedAttachment.owner,
    } as ExternalReferenceNoSOAttachmentPayload;
  },
};
