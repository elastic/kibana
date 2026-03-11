/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { UserActionContentToolbar } from '../../user_actions/content_toolbar';
import { UserCommentPropertyActions } from '../../user_actions/property_actions/user_comment_property_actions';
import * as i18n from '../../user_actions/comment/translations';
import { useCommentRenderingContext } from '../../user_actions/comment/comment_rendering_context';

export interface CommentActionsProps {
  commentId: string;
  content: string;
}

/**
 * Renders a toolbar with actions for a comment.
 */
export const CommentActions: React.FC<CommentActionsProps> = ({ commentId, content }) => {
  const {
    loadingCommentIds = [],
    handleManageMarkdownEditId,
    handleDeleteComment,
    handleManageQuote,
  } = useCommentRenderingContext();

  const isLoading = useMemo(
    () => loadingCommentIds.includes(commentId),
    [loadingCommentIds, commentId]
  );

  const onEdit = useCallback(() => {
    if (handleManageMarkdownEditId) {
      handleManageMarkdownEditId(commentId);
    }
  }, [handleManageMarkdownEditId, commentId]);

  const onDelete = useCallback(() => {
    if (handleDeleteComment) {
      handleDeleteComment(commentId, i18n.DELETE_COMMENT_SUCCESS_TITLE);
    }
  }, [handleDeleteComment, commentId]);

  const onQuote = useCallback(() => {
    if (handleManageQuote) {
      handleManageQuote(content);
    }
  }, [handleManageQuote, content]);

  return (
    <UserActionContentToolbar id={commentId}>
      <UserCommentPropertyActions
        isLoading={isLoading}
        commentContent={content}
        onEdit={onEdit}
        onDelete={onDelete}
        onQuote={onQuote}
      />
    </UserActionContentToolbar>
  );
};

CommentActions.displayName = 'CommentActions';
