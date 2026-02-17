/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../../common/types/domain';
import type { AttachmentAttributesV2 } from '../../../../common/types/domain/attachment/v2';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes as ServerUnifiedAttachmentAttributes,
} from '../../../common/types/attachments_v2';
import type { AttachmentTypeTransformer } from './base';
import {
  commentAttachmentTransformer,
  hasCommentField,
  transformCommentPatchToUnifiedPatch,
} from './comment';

export type { AttachmentTypeTransformer } from './base';
export { hasCommentField, transformCommentPatchToUnifiedPatch };

/**
 * Returns the attachment type string from attributes (unified or legacy shape).
 * Used to select the correct transformer.
 */
export function getAttachmentTypeFromAttributes(attributes: unknown): string {
  if (attributes === null || typeof attributes !== 'object') {
    return COMMENT_ATTACHMENT_TYPE;
  }
  const attrs = attributes as Record<string, unknown>;
  if (typeof attrs.type === 'string') {
    return attrs.type;
  }
  // Legacy comment has 'comment' field and type 'user'
  if ('comment' in attrs) {
    return AttachmentType.user;
  }
  return COMMENT_ATTACHMENT_TYPE;
}

/**
 * Pass-through transformer for attachment types that do not have schema migration.
 * Returns attributes as-is in the requested schema (caller must ensure shape is correct).
 */
const passThroughTransformer: AttachmentTypeTransformer<
  AttachmentPersistedAttributes,
  ServerUnifiedAttachmentAttributes
> = {
  toNewSchema(attributes: unknown): ServerUnifiedAttachmentAttributes {
    return attributes as ServerUnifiedAttachmentAttributes;
  },
  toOldSchema(attributes: unknown, _owner?: string): AttachmentPersistedAttributes {
    return attributes as AttachmentPersistedAttributes;
  },
  isType(_attributes: AttachmentAttributesV2): boolean {
    return false;
  },
  isNewType(_attributes: unknown): boolean {
    return false;
  },
  isOldType(_attributes: unknown): boolean {
    return false;
  },
};

/**
 * Returns the transformer for the given attachment type.
 * Use getAttachmentTypeFromAttributes(attributes) to derive type from decoded attributes.
 */
export function getAttachmentTypeTransformer(
  type: string
): AttachmentTypeTransformer<AttachmentPersistedAttributes, ServerUnifiedAttachmentAttributes> {
  if (type === COMMENT_ATTACHMENT_TYPE || type === AttachmentType.user) {
    return commentAttachmentTransformer;
  }
  return passThroughTransformer;
}
