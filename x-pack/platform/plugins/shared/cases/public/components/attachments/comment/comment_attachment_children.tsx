/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import type { UnifiedValueAttachmentViewProps } from '../../../client/attachment_framework/types';
import { UserActionMarkdown } from '../../user_actions/markdown_form';
import { UserActionContentToolbar } from '../../user_actions/content_toolbar';
import { HoverableAvatarResolver } from '../../user_profiles/hoverable_avatar_resolver';
import { UserCommentPropertyActions } from '../../user_actions/property_actions/user_comment_property_actions';
import { getMarkdownEditorStorageKey } from '../../markdown_editor/utils';
import * as i18n from '../../user_actions/comment/translations';
import { useCommentRenderingContext } from '../../user_actions/comment/comment_rendering_context';
import type { User } from '../../../../common/types/domain';
import type { CaseUser } from '../../../containers/types';

const getCommentFooterCss = (euiTheme?: EuiThemeComputed<{}>) => {
  if (!euiTheme) {
    return css``;
  }
  return css`
    border-top: ${euiTheme.border.thin};
    padding: ${euiTheme.size.s};
  `;
};

const hasDraftComment = (
  applicationId = '',
  caseId: string,
  commentId: string,
  comment: string
): boolean => {
  const draftStorageKey = getMarkdownEditorStorageKey({ appId: applicationId, caseId, commentId });
  const sessionValue = sessionStorage.getItem(draftStorageKey);
  return Boolean(sessionValue && sessionValue !== comment);
};

export type CommentAttachmentChildrenProps = UnifiedValueAttachmentViewProps;

export const CommentAttachmentChildren: React.FC<CommentAttachmentChildrenProps> = (props) => {
  // Get rendering concerns from context instead of props
  const renderingContext = useCommentRenderingContext();

  const content = (props.data?.content as string) || '';
  const commentId = props.attachmentId;
  const caseId = props.caseData?.id || '';
  const appId = renderingContext.appId || '';
  const manageMarkdownEditIds = renderingContext.manageMarkdownEditIds || [];
  const loadingCommentIds = renderingContext.loadingCommentIds || [];
  const euiTheme = renderingContext.euiTheme;
  const commentRefs = renderingContext.commentRefs;
  const handleManageMarkdownEditId = renderingContext.handleManageMarkdownEditId;
  const handleSaveComment = renderingContext.handleSaveComment;

  const isEdit = manageMarkdownEditIds.includes(commentId);
  const isLoading = loadingCommentIds.includes(commentId);

  return (
    <>
      <UserActionMarkdown
        key={isEdit ? commentId : undefined}
        ref={(element) => {
          if (commentRefs?.current) {
            commentRefs.current[commentId] = element;
          }
        }}
        id={commentId}
        content={content}
        isEditable={isEdit}
        caseId={caseId}
        onChangeEditable={handleManageMarkdownEditId || (() => {})}
        onSaveContent={(newContent: string) => {
          if (handleSaveComment) {
            // Extract id and version from props metadata if available
            const metadata = props.metadata || {};
            const attachmentId = props.attachmentId;
            const version = (metadata.version as string) || '';
            handleSaveComment({ id: attachmentId, version }, newContent);
          }
        }}
      />
      {!isEdit && !isLoading && hasDraftComment(appId, caseId, commentId, content) ? (
        <EuiText css={getCommentFooterCss(euiTheme)}>
          <EuiText color="subdued" size="xs" data-test-subj="user-action-comment-unsaved-draft">
            {i18n.UNSAVED_DRAFT_COMMENT}
          </EuiText>
        </EuiText>
      ) : null}
    </>
  );
};

export const CommentAttachmentActions: React.FC<CommentAttachmentChildrenProps> = (props) => {
  // Get rendering concerns from context instead of props
  const renderingContext = useCommentRenderingContext();

  const content = (props.data?.content as string) || '';
  const commentId = props.attachmentId;
  const loadingCommentIds = renderingContext.loadingCommentIds || [];
  const handleManageMarkdownEditId = renderingContext.handleManageMarkdownEditId;
  const handleDeleteComment = renderingContext.handleDeleteComment;
  const handleManageQuote = renderingContext.handleManageQuote;

  const isLoading = loadingCommentIds.includes(commentId);

  return (
    <UserActionContentToolbar id={commentId}>
      <UserCommentPropertyActions
        isLoading={isLoading}
        commentContent={content}
        onEdit={() => {
          if (handleManageMarkdownEditId) {
            handleManageMarkdownEditId(commentId);
          }
        }}
        onDelete={() => {
          if (handleDeleteComment) {
            handleDeleteComment(commentId, i18n.DELETE_COMMENT_SUCCESS_TITLE);
          }
        }}
        onQuote={() => {
          if (handleManageQuote) {
            handleManageQuote(content);
          }
        }}
      />
    </UserActionContentToolbar>
  );
};

export const CommentAttachmentTimelineAvatar: React.FC<CommentAttachmentChildrenProps> = (
  props
) => {
  // Get rendering concerns from context
  const renderingContext = useCommentRenderingContext();
  // Get attachment metadata from props (attachment-specific data)
  const createdBy = (props.metadata?.createdBy as User) || renderingContext.createdBy;
  const userProfiles = renderingContext.userProfiles || new Map();

  if (createdBy) {
    // User type has full_name (snake_case), but HoverableAvatarResolver expects CaseUser
    // which is compatible with User type from domain
    return (
      <HoverableAvatarResolver
        user={createdBy as unknown as CaseUser}
        userProfiles={userProfiles}
      />
    );
  }

  return 'editorComment';
};

CommentAttachmentChildren.displayName = 'CommentAttachmentChildren';
CommentAttachmentActions.displayName = 'CommentAttachmentActions';
CommentAttachmentTimelineAvatar.displayName = 'CommentAttachmentTimelineAvatar';
