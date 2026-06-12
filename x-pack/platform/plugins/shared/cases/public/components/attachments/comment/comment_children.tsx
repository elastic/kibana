/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import {
  UserActionMarkdown,
  type UserActionMarkdownRefObject,
} from '../../user_actions/markdown_form';
import * as i18n from '../../user_actions/comment/translations';
import { useCommentRenderingContext } from '../../user_actions/comment/comment_rendering_context';
import { hasDraftComment, getCommentFooterCss } from './utils';

export interface CommentChildrenProps {
  commentId: string;
  content: string;
  caseId: string;
  version: string;
}

/**
 * Renders the content of a comment.
 */
export const CommentChildren: React.FC<CommentChildrenProps> = ({
  commentId,
  content,
  caseId,
  version,
}) => {
  const {
    appId = '',
    manageMarkdownEditIds = [],
    loadingCommentIds = [],
    euiTheme,
    commentRefs,
    handleManageMarkdownEditId,
    handleSaveComment,
  } = useCommentRenderingContext();

  const setCommentRef = useCallback(
    (element: UserActionMarkdownRefObject | null) => {
      if (commentRefs?.current) {
        if (element != null) {
          commentRefs.current[commentId] = element;
        } else {
          delete commentRefs.current[commentId];
        }
      }
    },
    [commentRefs, commentId]
  );

  const isEdit = useMemo(
    () => manageMarkdownEditIds.includes(commentId),
    [manageMarkdownEditIds, commentId]
  );

  const isLoading = useMemo(
    () => loadingCommentIds.includes(commentId),
    [loadingCommentIds, commentId]
  );

  const hasDraft = useMemo(
    () => !isEdit && !isLoading && hasDraftComment(appId, caseId, commentId, content),
    [appId, caseId, commentId, content, isEdit, isLoading]
  );

  const onSaveContent = useCallback(
    (newContent: string) => {
      if (handleSaveComment) {
        handleSaveComment({ id: commentId, version }, newContent);
      }
    },
    [handleSaveComment, commentId, version]
  );

  return (
    <>
      <UserActionMarkdown
        key={isEdit ? commentId : undefined}
        ref={setCommentRef}
        id={commentId}
        content={content}
        isEditable={isEdit}
        caseId={caseId}
        onChangeEditable={handleManageMarkdownEditId || (() => {})}
        onSaveContent={onSaveContent}
      />
      {hasDraft ? (
        <EuiText css={getCommentFooterCss(euiTheme)}>
          <EuiText color="subdued" size="xs" data-test-subj="user-action-comment-unsaved-draft">
            {i18n.UNSAVED_DRAFT_COMMENT}
          </EuiText>
        </EuiText>
      ) : null}
    </>
  );
};

CommentChildren.displayName = 'CommentChildren';
