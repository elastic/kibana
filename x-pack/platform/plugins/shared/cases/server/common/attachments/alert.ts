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
import type { AlertAttachmentPayload } from '../../../common/types/domain';
import { AttachmentType } from '../../../common/types/domain';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import { extractCommonAttributes } from './base';
import {
  isLegacyAlertAttachment,
  isUnifiedAlertAttachment,
  toStringOrStringArray,
} from '../../../common/utils/attachments';
import { toUnifiedAttachmentType } from '../../../common/utils/attachments/migration_utils';
import { normalizeReferenceAttachmentId } from './utils';

export interface AlertMetadata {
  index?: string | string[];
  rule?: {
    id: string | null;
    name: string | null;
  } | null;
}

function isLegacyAlertSchema(attributes: AttachmentAttributesV2): boolean {
  return isLegacyAlertAttachment(attributes);
}

function isUnifiedAlertSchema(
  attributes: AttachmentAttributesV2
): attributes is UnifiedAttachmentAttributes & UnifiedReferenceAttachmentPayload {
  return isUnifiedAlertAttachment(attributes);
}

const toAlertMetadata = (
  index: string | string[] | undefined,
  rule: { id: string | null; name: string | null } | undefined
): UnifiedReferenceAttachmentPayload['metadata'] => {
  const normalizedIndex = toStringOrStringArray(index);
  const metadata: NonNullable<UnifiedReferenceAttachmentPayload['metadata']> = {};
  if (normalizedIndex != null) {
    metadata.index = normalizedIndex;
  }
  if (rule != null) {
    metadata.rule = { id: rule.id, name: rule.name };
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

/**
 * Transformer for alert attachments (legacy schema <-> unified schema).
 * Legacy: { type: 'alert', alertId, index, rule } (AttachmentType.alert)
 * Unified: { type: owner-scoped alert, attachmentId: string|string[], metadata: { index, rule } }
 */
export const alertAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    const attrs = attributes as AttachmentAttributesV2;
    if (isUnifiedAlertSchema(attrs)) {
      return attrs as UnifiedAttachmentAttributes;
    }
    if (isLegacyAlertSchema(attrs)) {
      const legacyAttrs = attrs as AttachmentPersistedAttributes & {
        alertId: string | string[];
        index?: string | string[];
        rule?: { id: string | null; name: string | null };
      };
      return {
        type: toUnifiedAttachmentType(AttachmentType.alert, legacyAttrs.owner),
        attachmentId: normalizeReferenceAttachmentId(legacyAttrs.alertId),
        metadata: toAlertMetadata(legacyAttrs.index, legacyAttrs.rule),
        owner: legacyAttrs.owner,
        ...extractCommonAttributes(legacyAttrs as AttachmentAttributesV2),
      } as UnifiedAttachmentAttributes;
    }
    return attrs as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    const attrs = attributes as AttachmentPersistedAttributes | UnifiedAttachmentAttributes;
    const attrsAsCombined = attrs as AttachmentAttributesV2;

    if (isLegacyAlertSchema(attrsAsCombined)) {
      return attrs as AttachmentPersistedAttributes;
    }

    if (isUnifiedAlertSchema(attrsAsCombined)) {
      const refAttrs = attrsAsCombined;
      const metadata = refAttrs.metadata as AlertMetadata | null | undefined;
      return {
        type: AttachmentType.alert,
        alertId: refAttrs.attachmentId,
        index: toStringOrStringArray(metadata?.index) ?? '',
        rule: { id: metadata?.rule?.id ?? null, name: metadata?.rule?.name ?? null },
        owner: refAttrs.owner,
        ...extractCommonAttributes(attrs as UnifiedAttachmentAttributes),
      } as AttachmentPersistedAttributes;
    }
    return attrs as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyAlertSchema(attributes) || isUnifiedAlertSchema(attributes);
  },

  isUnifiedType(attributes: AttachmentAttributesV2): boolean {
    return isUnifiedAlertSchema(attributes);
  },

  isLegacyType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyAlertSchema(attributes);
  },

  isLegacyPayload(attachment: AttachmentRequestV2): attachment is AlertAttachmentPayload {
    return isLegacyAlertAttachment(attachment);
  },
  isUnifiedPayload(attachment: AttachmentRequestV2): boolean {
    return isUnifiedAlertAttachment(attachment);
  },
  toUnifiedPayload(attachment: AlertAttachmentPayload): UnifiedReferenceAttachmentPayload {
    return {
      type: toUnifiedAttachmentType(AttachmentType.alert, attachment.owner),
      attachmentId: normalizeReferenceAttachmentId(attachment.alertId),
      metadata: toAlertMetadata(attachment.index, attachment.rule),
      owner: attachment.owner,
    };
  },
  toLegacyPayload(attachment: UnifiedReferenceAttachmentPayload): AlertAttachmentPayload {
    const metadata = attachment.metadata as AlertMetadata | null | undefined;
    return {
      type: AttachmentType.alert,
      alertId: attachment.attachmentId,
      index: toStringOrStringArray(metadata?.index) ?? '',
      rule: { id: metadata?.rule?.id ?? null, name: metadata?.rule?.name ?? null },
      owner: attachment.owner,
    };
  },
};
