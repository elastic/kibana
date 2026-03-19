/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachment } from '../../../../common/types/domain';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { EVENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
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
  | 'onShowAlertDetails'
  | 'handleManageMarkdownEditId'
  | 'handleManageQuote'
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
  onShowAlertDetails,
  handleManageMarkdownEditId,
  handleManageQuote,
}: BuilderArgs): ReturnType<UserActionBuilder> => {
  return createRegisteredAttachmentUserActionBuilder({
    userAction,
    userProfiles,
    attachment,
    registry: unifiedAttachmentTypeRegistry,
    caseData,
    handleDeleteComment,
    isLoading,
    handleManageMarkdownEditId,
    handleManageQuote,
    manageMarkdownEditIds,
    selectedOutlineCommentId,
    loadingCommentIds,
    appId,
    euiTheme,
    getId: () => toUnifiedAttachmentType(attachment.type),
    getAttachmentViewProps: () => {
      const baseProps = {
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
      if ('attachmentId' in attachment && attachment.attachmentId != null) {
        const resolvedType = toUnifiedAttachmentType(attachment.type);
        return {
          ...baseProps,
          attachmentId: attachment.attachmentId as string,
          // Event attachments use the flyout hook directly in Security Solution; only pass for non-event types (e.g. alerts)
          ...(resolvedType !== EVENT_ATTACHMENT_TYPE && { onShowEventDetails: onShowAlertDetails }),
        };
      }
      return baseProps;
    },
  });
};
