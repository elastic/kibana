/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest } from '../../../../common/types/api';
import type { UnifiedValueAttachmentPayload } from '../../../../common/types/domain/attachment/v2';
import { AttachmentType } from '../../../../common/types/domain';
import type { ConfigType } from '../../../config';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments';

/**
 * OLD FORMAT (cases-comments SO):
 * {
 *   type: "user",
 *   comment: "string",
 *   owner: "string"
 * }
 *
 * NEW FORMAT (cases-attachments SO):
 * {
 *   type: "comment",
 *   data: {
 *     content: "string"
 *   },
 *   metadata: {
 *     owner: "string"  // optional, can also be at top level
 *   },
 *   owner?: "string"  // optional, can be at top level instead of metadata
 * }
 */

/**
 * Type guard to check if an attachment is in the old format (has 'comment' field directly)
 */
export function isOldFormatCommentAttachment(
  attachment: AttachmentRequest | UnifiedValueAttachmentPayload
): attachment is AttachmentRequest & {
  type: typeof AttachmentType.user;
  comment: string;
  owner: string;
} {
  return (
    typeof attachment === 'object' &&
    attachment !== null &&
    'type' in attachment &&
    (attachment.type === AttachmentType.user || attachment.type === 'user') &&
    'comment' in attachment &&
    typeof (attachment as { comment: unknown }).comment === 'string' &&
    'owner' in attachment &&
    typeof (attachment as { owner: unknown }).owner === 'string'
  );
}

/**
 * Type guard to check if an attachment is in the new unified format (has 'data.content' field)
 */
export function isNewFormatCommentAttachment(
  attachment: AttachmentRequest | UnifiedValueAttachmentPayload
): attachment is UnifiedValueAttachmentPayload & {
  type: 'comment';
  data: { content: string };
} {
  if (
    typeof attachment !== 'object' ||
    attachment === null ||
    !('type' in attachment) ||
    typeof (attachment as { type: unknown }).type !== 'string'
  ) {
    return false;
  }

  const attachmentType = (attachment as { type: string }).type;
  const normalizedType = toUnifiedAttachmentType(attachmentType);

  if (normalizedType !== 'comment' && attachmentType !== 'comment') {
    return false;
  }

  return (
    'data' in attachment &&
    attachment.data !== null &&
    typeof attachment.data === 'object' &&
    'content' in attachment.data &&
    typeof (attachment.data as { content: unknown }).content === 'string'
  );
}

/**
 * Determines which saved object type should be used for comment attachments
 * based on the feature flag.
 *
 * @param config - The cases plugin configuration
 * @returns The saved object type to use ('cases-attachments' or 'cases-comments')
 */
export function getCommentAttachmentSavedObjectType(
  config: ConfigType
): 'cases-attachments' | 'cases-comments' {
  // If feature flag is enabled, use new SO type
  if (config.attachments?.enabled) {
    return 'cases-attachments';
  }
  // Otherwise, use old SO type
  return 'cases-comments';
}

/**
 * Transforms an old format comment attachment to the new unified format.
 *
 * @param oldFormat - The old format attachment
 * @returns The new unified format attachment
 */
export function transformOldToNewCommentAttachment(
  oldFormat: AttachmentRequest
): UnifiedValueAttachmentPayload {
  if (isOldFormatCommentAttachment(oldFormat)) {
    return {
      type: 'comment',
      data: {
        content: oldFormat.comment,
      },
    };
  } else {
    throw new Error('Invalid old format comment attachment');
  }
}

/**
 * Transforms a new unified format comment attachment to the old format.
 *
 * @param newFormat - The new unified format attachment
 * @returns The old format attachment
 */
export function transformNewToOldCommentAttachment(
  newFormat: UnifiedValueAttachmentPayload,
  owner: string
): AttachmentRequest {
  const content = newFormat.data.content;

  if (!content) {
    throw new Error('Comment content is required for comment attachments');
  }

  return {
    type: AttachmentType.user,
    comment: content as string,
    owner,
  };
}
