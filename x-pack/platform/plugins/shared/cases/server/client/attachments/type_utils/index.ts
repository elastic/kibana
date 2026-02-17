/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest } from '../../../../common/types/api';
import type { UnifiedValueAttachmentPayload } from '../../../../common/types/domain/attachment/v2';
import type { ConfigType } from '../../../config';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments';
import {
  getCommentAttachmentSavedObjectType,
  isOldFormatCommentAttachment,
  isNewFormatCommentAttachment,
  transformOldToNewCommentAttachment,
  transformNewToOldCommentAttachment,
} from './comment';

export interface AttachmentTypeTransformers {
  getSavedObjectType: (config: ConfigType) => 'cases-attachments' | 'cases-comments';
  isOldFormat: (attachment: AttachmentRequest | UnifiedValueAttachmentPayload) => boolean;
  isNewFormat: (attachment: AttachmentRequest | UnifiedValueAttachmentPayload) => boolean;
  transformOldToNew: (attachment: AttachmentRequest) => UnifiedValueAttachmentPayload;
  transformNewToOld: (
    attachment: UnifiedValueAttachmentPayload,
    owner: string
  ) => AttachmentRequest;
}

/**
 * Gets the appropriate transform functions for a given attachment type.
 *
 * @param attachmentType - The attachment type (can be canonical or legacy name)
 * @returns Transform functions for the attachment type, or undefined if not supported
 */
export function getAttachmentTypeTransformers(
  attachmentType: string
): AttachmentTypeTransformers | undefined {
  const normalizedType = toUnifiedAttachmentType(attachmentType);

  // Currently only 'comment' type is migrated
  if (normalizedType === 'comment') {
    return {
      getSavedObjectType: getCommentAttachmentSavedObjectType,
      isOldFormat: isOldFormatCommentAttachment,
      isNewFormat: isNewFormatCommentAttachment,
      transformOldToNew: transformOldToNewCommentAttachment,
      transformNewToOld: transformNewToOldCommentAttachment,
    };
  }

  // Future migrated types will be added here
  // if (normalizedType === 'alert') {
  //   return { ... };
  // }

  return undefined;
}
