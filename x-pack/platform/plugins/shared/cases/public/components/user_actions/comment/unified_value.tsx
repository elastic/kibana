/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserCommentAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'unifiedAttachmentTypeRegistry'
  | 'caseData'
  | 'handleDeleteComment'
  | 'userProfiles'
> & {
  attachment: SnakeToCamelCase<UserCommentAttachment>;
  isLoading: boolean;
};

/**
 * Creates a user action builder for unified value attachments (comment type).
 *
 * This builder extracts only attachment-specific data into the `data` field,
 * keeping the structure clean and scalable. UI-specific rendering concerns
 * are provided through the CommentRenderingContext, which is set up at the
 * UserActionsList level.
 *
 * This pattern should be followed for other unified value attachment types
 * to maintain separation between attachment data and rendering logic.
 */
export const createUnifiedValueAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  unifiedAttachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: unifiedAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () => toUnifiedAttachmentType(attachment.type), // Registry uses canonical name (e.g. 'comment' not 'user')
    getAttachmentViewProps: () => ({
      // Only attachment-specific data - this is what gets validated on the server
      data: {
        content: attachment.comment,
      },
      // Attachment metadata - properties of the attachment itself (not rendering concerns)
      // Rendering concerns (handlers, UI state) are provided through CommentRenderingContext
      metadata: {
        owner: attachment.owner,
        createdBy: attachment.createdBy,
        createdAt: attachment.createdAt,
        updatedBy: attachment.updatedBy,
        updatedAt: attachment.updatedAt,
        pushedAt: attachment.pushedAt,
        pushedBy: attachment.pushedBy,
      },
      attachmentId: attachment.id,
      caseData: { id: caseData.id, title: caseData.title },
    }),
  });
};
