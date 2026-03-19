/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  UnifiedReferenceAttachmentPayload,
  AttachmentAttributesV2,
} from '../../../common/types/domain/attachment/v2';
import { AttachmentType } from '../../../common/types/domain';
import { EVENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import { extractCommonAttributes } from './base';
import {
  isLegacyAttachmentRequest,
  isUnifiedReferenceAttachmentRequest,
} from '../../../common/utils/attachments';

function getFirstString(value: string | string[] | undefined | null): string {
  if (value == null) {
    return '';
  }
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function isLegacyEventSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    isLegacyAttachmentRequest(attributes) &&
    attributes.type === AttachmentType.event &&
    'eventId' in attributes
  );
}

function isUnifiedEventSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    isUnifiedReferenceAttachmentRequest(attributes) &&
    attributes.type === EVENT_ATTACHMENT_TYPE &&
    'attachmentId' in attributes
  );
}

/**
 * Transformer for event attachments (legacy schema <-> unified schema).
 * Legacy: { type: 'event', eventId, index } (AttachmentType.event)
 * Unified: { type: 'securityEvent', attachmentId: string, metadata: { index?: string } }
 * attachmentId is string only; for legacy multiple events, uses first eventId.
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
      const eventId = getFirstString(legacyAttrs.eventId);
      const index = getFirstString(legacyAttrs.index);
      return {
        type: EVENT_ATTACHMENT_TYPE,
        attachmentId: eventId,
        metadata: index ? { index } : undefined,
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
      const unifiedAttrs = attrs as UnifiedAttachmentAttributes;
      const refAttrs = attrs as UnifiedReferenceAttachmentPayload;
      const index = refAttrs.metadata?.index;
      return {
        type: AttachmentType.event,
        eventId: refAttrs.attachmentId,
        index: typeof index === 'string' ? index : '',
        owner: unifiedAttrs.owner,
        ...extractCommonAttributes(unifiedAttrs),
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

  isLegacyPayload(attachment: AttachmentRequestV2): boolean {
    return (
      isLegacyAttachmentRequest(attachment) &&
      attachment.type === AttachmentType.event &&
      'eventId' in attachment
    );
  },
  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return (
      isUnifiedReferenceAttachmentRequest(attachment) &&
      attachment.type === EVENT_ATTACHMENT_TYPE &&
      'attachmentId' in attachment
    );
  },
  toUnifiedPayload(attachment: AttachmentRequestV2): UnifiedReferenceAttachmentPayload {
    if (this.isLegacyPayload(attachment)) {
      const legacy = attachment as { eventId: string | string[]; index?: string | string[] };
      return {
        type: EVENT_ATTACHMENT_TYPE,
        attachmentId: getFirstString(legacy.eventId),
        metadata: legacy.index ? { index: getFirstString(legacy.index) } : undefined,
        owner: attachment.owner,
      };
    }
    return attachment as UnifiedReferenceAttachmentPayload;
  },
  toLegacyPayload(attachment: AttachmentRequestV2): AttachmentRequest {
    if (this.isUnifiedPayload(attachment)) {
      const unified = attachment as UnifiedReferenceAttachmentPayload;
      const index = unified.metadata?.index;
      return {
        type: AttachmentType.event,
        eventId: unified.attachmentId,
        index: typeof index === 'string' ? index : '',
        owner: unified.owner,
      };
    }
    return attachment as AttachmentRequest;
  },
};
