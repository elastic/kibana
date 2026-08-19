/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import type {
  UnifiedReferenceAttachmentPayload,
  AttachmentAttributesV2,
} from '../../../common/types/domain/attachment/v2';
import type {
  AlertAttachmentAttributes,
  AlertAttachmentPayload,
} from '../../../common/types/domain';
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

/**
 * Persisted-attribute shape for a unified alert attachment SO.
 */
type UnifiedAlertPersistedAttributes = UnifiedReferenceAttachmentPayload &
  AttachmentPersistedAttributes & {
    metadata?: AlertMetadata | null;
  };

// `@types/lodash` types `isPlainObject` as returning `boolean`, so we wrap it
// to add a `value is Record<string, unknown>` predicate. Same pattern as
// `isRecord` in ./persistable_state.ts.
const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

/**
 * Type guard for legacy alert persisted attributes (`type === 'alert'`).
 */
const isLegacyAlertSchema = (attributes: unknown): attributes is AlertAttachmentAttributes =>
  isRecord(attributes) && isLegacyAlertAttachment(attributes as AttachmentRequestV2);

/**
 * Type guard for unified alert persisted attributes
 */
const isUnifiedAlertSchema = (attributes: unknown): attributes is UnifiedAlertPersistedAttributes =>
  isRecord(attributes) && isUnifiedAlertAttachment(attributes as AttachmentRequestV2);

const toAlertMetadata = (
  index: string | string[] | undefined,
  rule: { id: string | null; name: string | null } | null | undefined
): UnifiedReferenceAttachmentPayload['metadata'] => {
  const normalizedIndex = toStringOrStringArray(index, { preserveArray: true });
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
    if (isUnifiedAlertSchema(attributes)) {
      return attributes;
    }
    if (isLegacyAlertSchema(attributes)) {
      return {
        type: toUnifiedAttachmentType(AttachmentType.alert, attributes.owner),
        attachmentId: normalizeReferenceAttachmentId(attributes.alertId),
        metadata: toAlertMetadata(attributes.index, attributes.rule),
        owner: attributes.owner,
        ...extractCommonAttributes(attributes as AttachmentAttributesV2),
      } as UnifiedAttachmentAttributes;
    }
    return attributes as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown): AttachmentPersistedAttributes {
    if (isLegacyAlertSchema(attributes)) {
      return attributes;
    }

    if (isUnifiedAlertSchema(attributes)) {
      const metadata = attributes.metadata ?? undefined;
      return {
        type: AttachmentType.alert,
        alertId: attributes.attachmentId,
        index: toStringOrStringArray(metadata?.index, { preserveArray: true }) ?? '',
        rule: { id: metadata?.rule?.id ?? null, name: metadata?.rule?.name ?? null },
        owner: attributes.owner,
        ...extractCommonAttributes(attributes as AttachmentAttributesV2),
      } as AttachmentPersistedAttributes;
    }
    return attributes as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isLegacyAlertSchema(attributes) || isUnifiedAlertSchema(attributes);
  },

  isUnifiedType(attributes: unknown): boolean {
    return isUnifiedAlertSchema(attributes);
  },

  isLegacyType(attributes: unknown): boolean {
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
      index: toStringOrStringArray(metadata?.index, { preserveArray: true }) ?? '',
      rule: { id: metadata?.rule?.id ?? null, name: metadata?.rule?.name ?? null },
      owner: attachment.owner,
    };
  },
};
