/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequestV2 } from '../../../common/types/api';
import type {
  UnifiedReferenceAttachmentPayload,
  AttachmentAttributesV2,
} from '../../../common/types/domain/attachment/v2';
import type { EventAttachmentPayload } from '../../../common/types/domain';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import { extractCommonAttributes } from './base';
import {
  isLegacyEventAttachment,
  isUnifiedEventAttachment,
  toStringOrStringArray,
} from '../../../common/utils/attachments';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments/migration_utils';
import { normalizeReferenceAttachmentId, toReferenceMetadata } from './utils';

function isLegacyEventSchema(attributes: AttachmentAttributesV2): boolean {
  return isLegacyEventAttachment(attributes);
}

function isUnifiedEventSchema(
  attributes: AttachmentAttributesV2
): attributes is UnifiedAttachmentAttributes & UnifiedReferenceAttachmentPayload {
  return isUnifiedEventAttachment(attributes);
}

/**
 * Transformer for event attachments (legacy schema <-> unified schema).
 * Legacy: { type: 'event', eventId, index } (AttachmentType.event)
 * Unified: { type: securitySolution scoped event, attachmentId: string|string[], metadata }
 *
 * eventId is mapped directly to attachmentId (including arrays for backward compatibility).
 */
export const eventAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    const attrs = attributes as AttachmentAttributesV2;
    if (isUnifiedEventSchema(attrs)) {
      return attrs as UnifiedAttachmentAttributes;
    }
    if (isLegacyEventSchema(attrs)) {
      const legacyAttrs = attrs as AttachmentPersistedAttributes & {
        eventId: string | string[];
        index?: string | string[];
      };
      return {
        type: toUnifiedAttachmentType(AttachmentType.event, legacyAttrs.owner),
        attachmentId: normalizeReferenceAttachmentId(legacyAttrs.eventId),
        metadata: toReferenceMetadata(legacyAttrs.index),
        owner: legacyAttrs.owner,
        ...extractCommonAttributes(legacyAttrs as AttachmentAttributesV2),
      } as UnifiedAttachmentAttributes;
    }
    return attrs as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    const attrs = attributes as AttachmentPersistedAttributes | UnifiedAttachmentAttributes;
    const attrsAsCombined = attrs as AttachmentAttributesV2;

    if (isLegacyEventSchema(attrsAsCombined)) {
      return attrs as AttachmentPersistedAttributes;
    }

    if (isUnifiedEventSchema(attrsAsCombined)) {
      const refAttrs = attrsAsCombined;
      return {
        type: AttachmentType.event,
        eventId: refAttrs.attachmentId,
        index: refAttrs.metadata?.index,
        owner: refAttrs.owner,
        ...extractCommonAttributes(attrs as UnifiedAttachmentAttributes),
      } as AttachmentPersistedAttributes;
    }
    return attrs as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyEventSchema(attributes) || isUnifiedEventSchema(attributes);
  },

  isUnifiedType(attributes: AttachmentAttributesV2): boolean {
    return isUnifiedEventSchema(attributes);
  },

  isLegacyType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyEventSchema(attributes);
  },

  isLegacyPayload(attachment: AttachmentRequestV2): attachment is EventAttachmentPayload {
    return isLegacyEventAttachment(attachment);
  },
  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return isUnifiedEventAttachment(attachment);
  },
  toUnifiedPayload(attachment: EventAttachmentPayload): UnifiedReferenceAttachmentPayload {
    return {
      type: toUnifiedAttachmentType(AttachmentType.event, attachment.owner),
      attachmentId: normalizeReferenceAttachmentId(attachment.eventId),
      metadata: toReferenceMetadata(attachment.index),
      owner: attachment.owner,
    };
  },
  toLegacyPayload(attachment: UnifiedReferenceAttachmentPayload): EventAttachmentPayload {
    const normalizedIndex = toStringOrStringArray(attachment.metadata?.index);
    if (normalizedIndex == null) {
      throw new Error(
        'security.event metadata.index is required when transforming unified payload to legacy event attachment'
      );
    }

    return {
      type: AttachmentType.event,
      eventId: attachment.attachmentId,
      index: normalizedIndex,
      owner: attachment.owner,
    };
  },
};
