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
import { UserActionMarkdown } from '../../user_actions/markdown_form';
import { getMarkdownEditorStorageKey } from '../../markdown_editor/utils';
import * as i18n from '../../user_actions/comment/translations';
import { useCommentRenderingContext } from '../../user_actions/comment/comment_rendering_context';

export interface CommentChildrenProps {
  commentId: string;
  content: string;
  caseId: string;
  version: string;
}

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
            handleSaveComment({ id: commentId, version }, newContent);
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

CommentChildren.displayName = 'CommentChildren';
