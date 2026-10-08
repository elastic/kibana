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
import { CollapsedActivityPreview } from './collapsed_activity_preview';
import { useRegisterActivityCollapseControls } from './activity_collapse_context';
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

  /* The header controls arrive from two places — the collapse toggle added below, and the copy-link
     and kebab built by the shared (non-redesign) builders, which space themselves with their own
     gutter. Only the gap is normalised here; all three keep EuiButtonIcon's default primary colour,
     which is what the copy-link and kebab have always used. */
  & .euiCommentEvent__headerActions {
    align-items: center;
    gap: ${euiTheme.size.xs};

    & .euiFlexGroup {
      gap: ${euiTheme.size.xs};
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

    // Some registered attachments share a data-test-subj because it identifies their attachment
    // type. Keep collapse state scoped to the rendered activity instead, so one attachment cannot
    // collapse another one of the same type.
    const collapsibleCommentIds = useMemo(
      () =>
        new Set(
          comments.flatMap((comment, index) =>
            comment.children != null &&
            comment.className !== 'isEdit' &&
            comment.className !== 'showMoreActivities'
              ? [`activity-${index}`]
              : []
          )
        ),
      [comments]
    );

    const collapsibleComments = useMemo(
      () =>
        comments.map((comment, index) => {
          const commentId = `activity-${index}`;
          if (!collapsibleCommentIds.has(commentId)) {
            return comment;
          }

          const isCollapsed = collapsedCommentIds.has(commentId);
          const toggleLabel = isCollapsed ? i18n.EXPAND_ACTIVITY : i18n.COLLAPSE_ACTIVITY;

          return {
            ...comment,
            // The toggle belongs beside the other per-activity controls in the header, not inside
            // the body: in the body it occupied a column of its own, pushed the content sideways,
            // and was left stranded next to nothing once the content was hidden.
            actions: (
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      aria-label={toggleLabel}
                      aria-expanded={!isCollapsed}
                      iconType={isCollapsed ? 'unfold' : 'fold'}
                      onClick={() => toggleComment(commentId)}
                      data-test-subj={`case-user-action-collapse-${index}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                {comment.actions ? <EuiFlexItem grow={false}>{comment.actions}</EuiFlexItem> : null}
              </EuiFlexGroup>
            ),
            // Collapsing to the header alone left the row saying nothing about what it holds, so a
            // collapsed activity keeps a cropped preview of its own body — the same bargain the
            // case description already strikes when collapsed.
            children: isCollapsed ? (
              <CollapsedActivityPreview
                onExpand={() => toggleComment(commentId)}
                data-test-subj={`case-user-action-preview-${index}`}
              >
                {comment.children}
              </CollapsedActivityPreview>
            ) : (
              comment.children
            ),
          };
        }),
      [comments, collapsedCommentIds, collapsibleCommentIds, toggleComment]
    );

    const hasCollapsibleComments = collapsibleCommentIds.size > 1;
    const allCollapsed =
      hasCollapsibleComments &&
      [...collapsibleCommentIds].every((id) => collapsedCommentIds.has(id));
    const allExpanded = [...collapsibleCommentIds].every((id) => !collapsedCommentIds.has(id));

    const collapseAll = React.useCallback(
      () => setCollapsedCommentIds(new Set(collapsibleCommentIds)),
      [collapsibleCommentIds]
    );
    const expandAll = React.useCallback(() => setCollapsedCommentIds(new Set()), []);

    // Published rather than rendered here: the pair belongs directly under the filter row, which is
    // where the attachments tab puts it. See ActivityCollapseControls.
    useRegisterActivityCollapseControls('feed', {
      canCollapse: hasCollapsibleComments,
      allCollapsed,
      allExpanded,
      collapseAll,
      expandAll,
    });

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
