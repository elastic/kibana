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
};

export const createUnifiedAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  unifiedAttachmentTypeRegistry,
  caseData,
  isLoading,
  handleDeleteComment,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  appId,
  euiTheme,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: unifiedAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    getId: () =>
      toUnifiedAttachmentType(
        attachment.type,
        Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner
      ),
    getAttachmentViewProps: () => {
      const attachmentId = 'attachmentId' in attachment ? attachment.attachmentId : null;
      return {
        attachmentId,
        data: attachment.data,
        metadata: attachment.metadata,
        createdBy: attachment.createdBy,
        version: attachment.version,
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
