/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachment } from '../../../../common/types/domain';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments';
import { createRegisteredAttachmentUserActionBuilder } from './registered_attachments';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'unifiedAttachmentTypeRegistry'
  | 'permissions'
  | 'caseData'
  | 'handleDeleteComment'
  | 'userProfiles'
  | 'manageMarkdownEditIds'
  | 'selectedOutlineCommentId'
  | 'loadingCommentIds'
  | 'appId'
  | 'euiTheme'
> & {
  attachment: SnakeToCamelCase<UnifiedAttachment>;
  isLoading: boolean;
  isDeleted?: boolean;
  /** The ids the create user action added, when a partial removal dropped some of them. */
  addedReferences?: AddedReferences;
};

export interface AddedReferences {
  attachmentId: string | string[];
  metadata?: UnifiedAttachment['metadata'];
}

export const createUnifiedAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  unifiedAttachmentTypeRegistry,
  permissions,
  caseData,
  isLoading,
  isDeleted,
  handleDeleteComment,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  appId,
  euiTheme,
  addedReferences,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  const liveAttachmentId = 'attachmentId' in attachment ? attachment.attachmentId : null;

  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: unifiedAttachmentTypeRegistry,
    permissions,
    caseData,
    handleDeleteComment,
    isLoading,
    isDeleted,
    getId: () =>
      toUnifiedAttachmentType(
        attachment.type,
        Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner
      ),
    getDeleteViewProps: addedReferences
      ? () => ({ attachmentId: liveAttachmentId, metadata: attachment.metadata })
      : undefined,
    getAttachmentViewProps: () => {
      return {
        attachmentId: liveAttachmentId,
        data: attachment.data,
        metadata: attachment.metadata,
        ...addedReferences,
        createdBy: attachment.createdBy,
        version: attachment.version,
        isDeleted: isDeleted ?? false,
        caseData: { id: caseData.id, title: caseData.title },
        rowContext: {
          manageMarkdownEditIds,
          selectedOutlineCommentId,
          loadingCommentIds,
          appId,
          euiTheme,
        },
      };
    },
  });
};
