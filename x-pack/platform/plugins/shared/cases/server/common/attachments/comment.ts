/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest, AttachmentRequestV2 } from '../../../common/types/api';
import type {
  UnifiedAttachmentPayload,
  UnifiedValueAttachmentPayload,
  AttachmentAttributesV2,
} from '../../../common/types/domain/attachment/v2';
import { AttachmentType } from '../../../common/types/domain';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../types/attachments_v2';
import { decodeCommentAttachmentData } from '../../attachment_framework/attachments/comment';
import type { AttachmentTypeTransformer } from './base';
import { toUnifiedAttachmentType } from '.';
import {
  isLegacyAttachmentRequest,
  isUnifiedValueAttachmentRequest,
} from '../../../common/utils/attachments';

// ---- Request layer (API / DTO) ----
export function isLegacyPayloadCommentAttachment(
  attachment: AttachmentRequestV2
): attachment is AttachmentRequest & {
  type: typeof AttachmentType.user;
  comment: string;
  owner: string;
} {
  if (!isLegacyAttachmentRequest(attachment)) {
    return false;
  }
  const typeStr: string = (attachment as { type: string }).type;
  if (typeStr !== AttachmentType.user && typeStr !== 'user') {
    return false;
  }
  return 'comment' in attachment && 'owner' in attachment;
}

/**
 * Type guard to check if an attachment is a unified request payload (has 'data.content' field).
 */
export function isUnifiedPayloadCommentAttachment(
  attachment: AttachmentRequestV2
): attachment is UnifiedValueAttachmentPayload & {
  type: 'comment';
  data: { content: string };
} {
  if (!isUnifiedValueAttachmentRequest(attachment)) {
    return false;
  }
  const normalizedType = toUnifiedAttachmentType(attachment.type);
  if (normalizedType !== 'comment' && attachment.type !== 'comment') {
    return false;
  }
  return 'content' in attachment.data;
}

export function toUnifiedPayloadCommentAttachment(
  legacyRequest: AttachmentRequest
): UnifiedValueAttachmentPayload {
  if (isLegacyPayloadCommentAttachment(legacyRequest)) {
    return {
      type: COMMENT_ATTACHMENT_TYPE,
      data: { content: legacyRequest.comment },
    };
  }
  throw new Error('Invalid legacy payload comment attachment');
}

export function toLegacyPayloadCommentAttachment(
  unifiedPayload: UnifiedValueAttachmentPayload,
  owner: string
): AttachmentRequest {
  const content = unifiedPayload.data?.content;
  if (content == null || (typeof content === 'string' && content.trim() === '')) {
    throw new Error('Comment content is required for comment attachments');
  }
  return {
    type: AttachmentType.user,
    comment: typeof content === 'string' ? content : String(content),
    owner,
  };
}

// ---- Persisted layer (SO attributes) ----
function isNewSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    typeof attributes === 'object' &&
    attributes !== null &&
    'data' in attributes &&
    (attributes as UnifiedAttachmentAttributes).type === 'comment'
  );
}

function isOldSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    typeof attributes === 'object' &&
    attributes !== null &&
    'comment' in attributes &&
    typeof (attributes as { type?: string }).type === 'string' &&
    ((attributes as { type: string }).type === 'user' ||
      (attributes as { type: string }).type === AttachmentType.user)
  );
}

/**
 * Transformer for comment attachments (old schema <-> unified schema).
 * Accepts either old or new schema; returns the requested schema so callers need not branch on type.
 */
export const commentAttachmentTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes
> = {
  toUnifiedSchema(attributes: unknown): UnifiedAttachmentAttributes {
    const attrs = attributes as AttachmentAttributesV2;
    if (isNewSchema(attrs)) {
      return attrs as UnifiedAttachmentAttributes;
    }
    if (isOldSchema(attrs)) {
      const oldAttrs = attrs as AttachmentPersistedAttributes;
      return {
        type: COMMENT_ATTACHMENT_TYPE,
        data: { content: oldAttrs.comment ?? '' },
        created_at: oldAttrs.created_at,
        created_by: oldAttrs.created_by,
        pushed_at: oldAttrs.pushed_at ?? null,
        pushed_by: oldAttrs.pushed_by ?? null,
        updated_at: oldAttrs.updated_at ?? null,
        updated_by: oldAttrs.updated_by ?? null,
      };
    }
    return attrs as UnifiedAttachmentAttributes;
  },

  toLegacySchema(attributes: unknown, owner?: string): AttachmentPersistedAttributes {
    const attrs = attributes as AttachmentPersistedAttributes | UnifiedAttachmentAttributes;
    const attrsAsCombined = attrs as AttachmentAttributesV2;

    if (isOldSchema(attrsAsCombined)) {
      const oldAttrs = attrs as AttachmentPersistedAttributes;
      const resolvedOwner = oldAttrs.owner ?? owner ?? '';
      return { ...oldAttrs, owner: resolvedOwner };
    }

    if (isNewSchema(attrsAsCombined)) {
      const newAttrs = attrs as UnifiedAttachmentAttributes;
      const resolvedOwner =
        (newAttrs.metadata as { owner?: string } | null | undefined)?.owner ?? owner ?? '';
      const parsed = decodeCommentAttachmentData(newAttrs.data);
      return {
        type: AttachmentType.user,
        comment: parsed.content,
        owner: resolvedOwner,
        created_at: newAttrs.created_at,
        created_by: newAttrs.created_by,
        pushed_at: newAttrs.pushed_at ?? null,
        pushed_by: newAttrs.pushed_by ?? null,
        updated_at: newAttrs.updated_at ?? null,
        updated_by: newAttrs.updated_by ?? null,
      };
    }
    return attrs as AttachmentPersistedAttributes;
  },

  isType(attributes: AttachmentAttributesV2): boolean {
    return isOldSchema(attributes) || isNewSchema(attributes);
  },

  isUnifiedType(attributes: AttachmentAttributesV2): boolean {
    return isNewSchema(attributes);
  },

  isLegacyType(attributes: AttachmentAttributesV2): boolean {
    return isOldSchema(attributes);
  },

  // --- Request payload (API layer) ---
  isLegacyPayload(attachment: unknown): boolean {
    return isLegacyPayloadCommentAttachment(attachment as AttachmentRequestV2);
  },
  isUnifiedPayload(attachment: unknown): boolean {
    return isUnifiedPayloadCommentAttachment(attachment as AttachmentRequestV2);
  },
  toUnifiedPayload(attachment: unknown): UnifiedValueAttachmentPayload {
    return toUnifiedPayloadCommentAttachment(attachment as AttachmentRequest);
  },
  toLegacyPayload(attachment: unknown, owner?: string): AttachmentRequest {
    return toLegacyPayloadCommentAttachment(
      attachment as UnifiedValueAttachmentPayload,
      owner ?? ''
    );
  },
};

/**
 * Type guard for a patch (or any object) that includes a comment field. Use when transforming update patches for new SO.
 */
export function hasCommentField(
  patch: unknown
): patch is { comment: string } & Record<string, unknown> {
  return (
    typeof patch === 'object' &&
    patch !== null &&
    'comment' in patch &&
    typeof (patch as { comment: unknown }).comment === 'string'
  );
}

/**
 * Transforms a patch that has a `comment` field into the unified patch shape (`data.content`). Use for updates when writing to new SO.
 */
export function transformCommentPatchToUnifiedPatch<T extends Record<string, unknown>>(
  patch: T
): Omit<T, 'comment'> & { data?: { content: string } } {
  if (!hasCommentField(patch)) {
    return patch as Omit<T, 'comment'> & { data?: { content: string } };
  }
  const { comment, ...rest } = patch;
  return { ...rest, data: { content: comment } };
}

/**
 * Returns comment content from a unified attachment payload when type is 'comment'.
 * Returns empty string for non-comment payloads or when data.content is missing.
 * Use this to avoid leaking attachment-type logic (e.g. 'comment', data.content) into generic utils.
 */
export function getCommentContentFromUnifiedPayload(payload: UnifiedAttachmentPayload): string {
  if (payload.type !== 'comment' || payload.data == null || typeof payload.data !== 'object') {
    return '';
  }
  const content = (payload.data as { content?: string }).content;
  return typeof content === 'string' ? content : '';
}

/**
 * Extracts the comment content from either old or new schema.
 */
export function extractCommentContent(attributes: AttachmentAttributesV2): string {
  if (!commentAttachmentTransformer.isType(attributes)) {
    throw new Error('Attachment is not a comment attachment');
  }

  if ('comment' in attributes && typeof attributes.comment === 'string') {
    return attributes.comment;
  }

  if ('data' in attributes && attributes.data != null) {
    const parsed = decodeCommentAttachmentData(attributes.data);
    return parsed.content;
  }

  throw new Error('Cannot extract comment content from attachment');
}
