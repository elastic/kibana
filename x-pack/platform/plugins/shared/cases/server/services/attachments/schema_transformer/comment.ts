/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../../common/types/domain';
import type { AttachmentAttributesV2 } from '../../../../common/types/domain/attachment/v2';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes as ServerUnifiedAttachmentAttributes,
} from '../../../common/types/attachments_v2';
import {
  decodeCommentAttachmentData,
  type CommentAttachmentData,
} from '../../../attachment_framework/attachments/comment';

function isNewSchema(attributes: AttachmentAttributesV2): boolean {
  return (
    typeof attributes === 'object' &&
    attributes !== null &&
    'data' in attributes &&
    (attributes as ServerUnifiedAttachmentAttributes).type === 'comment'
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
export const commentAttachmentTransformer = {
  /**
   * Returns attributes in new (unified) schema. Comment attachments are transformed; others are passed through.
   */
  toNewSchema(attributes: unknown): ServerUnifiedAttachmentAttributes {
    const attrs = attributes as AttachmentAttributesV2;
    if (isNewSchema(attrs)) {
      return attrs as ServerUnifiedAttachmentAttributes;
    }
    if (isOldSchema(attrs)) {
      const oldAttrs = attrs as AttachmentPersistedAttributes;
      const comment = oldAttrs.comment ?? '';
      const data: CommentAttachmentData = { content: comment };
      return {
        type: 'comment',
        data,
        metadata: { owner: oldAttrs.owner },
        created_at: oldAttrs.created_at,
        created_by: oldAttrs.created_by,
        pushed_at: oldAttrs.pushed_at ?? null,
        pushed_by: oldAttrs.pushed_by ?? null,
        updated_at: oldAttrs.updated_at ?? null,
        updated_by: oldAttrs.updated_by ?? null,
      };
    }
    return attrs as ServerUnifiedAttachmentAttributes;
  },

  /**
   * Returns attributes in old schema. Comment attachments are transformed; others are passed through.
   * Owner is derived from attributes when present (old schema .owner or new schema .metadata?.owner); otherwise uses the optional owner argument (e.g. from bulkCreate).
   */
  toOldSchema(attributes: unknown, owner?: string): AttachmentPersistedAttributes {
    const attrs = attributes as AttachmentPersistedAttributes | ServerUnifiedAttachmentAttributes;
    const attrsAsCombined = attrs as AttachmentAttributesV2;

    if (isOldSchema(attrsAsCombined)) {
      const oldAttrs = attrs as AttachmentPersistedAttributes;
      const resolvedOwner = oldAttrs.owner ?? owner ?? '';
      return { ...oldAttrs, owner: resolvedOwner };
    }

    if (isNewSchema(attrsAsCombined)) {
      const newAttrs = attrs as ServerUnifiedAttachmentAttributes;
      const resolvedOwner =
        (newAttrs.metadata as { owner?: string } | null | undefined)?.owner ?? owner ?? '';
      const parsed = decodeCommentAttachmentData(newAttrs.data);
      return {
        type: 'user',
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

  isNewType(attributes: AttachmentAttributesV2): boolean {
    return isNewSchema(attributes);
  },

  isOldType(attributes: AttachmentAttributesV2): boolean {
    return isOldSchema(attributes);
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
 * Extracts the comment content from either old or new schema.
 * New schema: uses shared comment attachment data schema (same as registry validator); no data-specific checks here.
 *
 * @param attributes - The attachment attributes (old or new schema)
 * @returns The comment content string
 * @throws Error if the attachment is not a comment attachment or content cannot be extracted
 */
export function extractCommentContent(attributes: AttachmentAttributesV2): string {
  if (!commentAttachmentTransformer.isType(attributes)) {
    throw new Error('Attachment is not a comment attachment');
  }

  // Old schema: has 'comment' field
  if ('comment' in attributes && typeof attributes.comment === 'string') {
    return attributes.comment;
  }

  // New schema: rely on shared schema (define → register & validate → transform)
  if ('data' in attributes && attributes.data != null) {
    const parsed = decodeCommentAttachmentData(attributes.data);
    return parsed.content;
  }

  throw new Error('Cannot extract comment content from attachment');
}
