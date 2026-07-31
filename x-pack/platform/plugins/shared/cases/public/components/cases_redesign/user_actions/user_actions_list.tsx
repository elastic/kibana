/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps, EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import React, { useMemo } from 'react';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { scaledMarkdownImages } from '../../utils';
import type { CaseUI } from '../../../containers/types';
import type { AddCommentRefObject } from '../../add_comment';
import type { UserActionMarkdownRefObject } from '../../user_actions/markdown_form';
import type { UseUserActionsHandler } from '../../user_actions/use_user_actions_handler';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CommentRenderingProvider } from '../../user_actions/comment/comment_rendering_context';
import { useHighlightLinkedComment } from './hooks/use_highlight_linked_comment';
import * as i18n from './translations';

const getCommentListCss = (euiTheme: EuiThemeComputed<{}>) => css`
  & .userAction__comment.outlined .euiCommentEvent {
    outline: solid 5px ${euiTheme.colors.borderBaseSubdued};
    margin: 0.5em;
    transition: 0.8s;
  }

  ${scaledMarkdownImages}

  & .draftFooter {
    & .euiCommentEvent__body {
      padding: 0;
    }
  }

  & .euiComment.isEdit {
    & .euiCommentEvent {
      border: none;
      box-shadow: none;
    }

    & .euiCommentEvent__body {
      padding: 0;
    }

    & .euiCommentEvent__header {
      display: none;
    }
  }

  & .comment-action.empty-comment [class*='euiCommentEvent-regular'] {
    box-shadow: none;
    .euiCommentEvent__header {
      padding: ${euiTheme.size.m} ${euiTheme.size.s};
      border-bottom: 0;
    }
  }
`;

export interface UserActionListProps {
  comments: EuiCommentProps[];
  commentRefs: React.MutableRefObject<
    Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>
  >;
  handleManageQuote: (quote: string) => void;
  caseData: CaseUI;
  userProfiles: Map<string, UserProfileWithAvatar>;
  actionsHandler: UseUserActionsHandler;
}

export const UserActionsList = React.memo(
  ({
    comments,
    caseData,
    userProfiles,
    commentRefs,
    handleManageQuote,
    actionsHandler,
  }: UserActionListProps) => {
    const { owner } = useCasesContext();
    const { euiTheme } = useEuiTheme();
    const [collapsedCommentIds, setCollapsedCommentIds] = React.useState<Set<string>>(
      () => new Set()
    );

    const {
      loadingCommentIds,
      selectedOutlineCommentId,
      manageMarkdownEditIds,
      handleManageMarkdownEditId,
      handleOutlineComment,
      handleSaveComment,
      handleDeleteComment,
    } = actionsHandler;

    useHighlightLinkedComment(handleOutlineComment);

    const toggleComment = React.useCallback((commentId: string) => {
      setCollapsedCommentIds((currentCollapsedCommentIds) => {
        const nextCollapsedCommentIds = new Set(currentCollapsedCommentIds);
        if (nextCollapsedCommentIds.has(commentId)) {
          nextCollapsedCommentIds.delete(commentId);
        } else {
          nextCollapsedCommentIds.add(commentId);
        }
        return nextCollapsedCommentIds;
      });
    }, []);

    const collapsibleComments = useMemo(
      () =>
        comments.map((comment, index) => {
          // Some registered attachments share a data-test-subj because it identifies
          // their attachment type. Keep collapse state scoped to the rendered activity
          // instead, so one attachment cannot collapse another one of the same type.
          const commentId = `activity-${index}`;
          const isCollapsible =
            comment.children != null &&
            comment.className !== 'isEdit' &&
            comment.className !== 'showMoreActivities';

          if (!isCollapsible) {
            return comment;
          }

          const isCollapsed = collapsedCommentIds.has(commentId);
          const toggleLabel = isCollapsed ? i18n.EXPAND_ACTIVITY : i18n.COLLAPSE_ACTIVITY;

          return {
            ...comment,
            children: (
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      aria-label={toggleLabel}
                      iconType={isCollapsed ? 'unfold' : 'fold'}
                      onClick={() => toggleComment(commentId)}
                      data-test-subj={`case-user-action-collapse-${index}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                {!isCollapsed ? <EuiFlexItem>{comment.children}</EuiFlexItem> : null}
              </EuiFlexGroup>
            ),
          };
        }),
      [comments, collapsedCommentIds, toggleComment]
    );

    const commentRenderingContext = useMemo(
      () => ({
        appId: owner[0] ?? '',
        caseData,
        userProfiles,
        commentRefs,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        euiTheme,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        handleDeleteComment,
      }),
      [
        owner,
        caseData,
        userProfiles,
        commentRefs,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        euiTheme,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        handleDeleteComment,
      ]
    );

    return (
      <CommentRenderingProvider value={commentRenderingContext}>
        <EuiCommentList
          css={getCommentListCss(euiTheme)}
          comments={collapsibleComments}
          data-test-subj="user-actions-list"
        />
      </CommentRenderingProvider>
    );
  }
);

UserActionsList.displayName = 'UserActionsList';
