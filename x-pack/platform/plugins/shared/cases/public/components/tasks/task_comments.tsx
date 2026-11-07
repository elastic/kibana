/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';
import type { CaseTaskComment } from '../../../common/types/domain/task_comment/v1';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import {
  useAddTaskComment,
  useDeleteTaskComment,
  useGetTaskComments,
} from '../../containers/use_case_tasks';
import { useCasesContext } from '../cases_context/use_cases_context';
import { MarkdownRenderer } from '../markdown_editor/renderer';
import { HoverableUserWithAvatarResolver } from '../user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionTimestamp } from '../user_actions/timestamp';
import * as i18n from './translations';

const toCaseUser = (user: CaseTaskComment['created_by']) => ({
  username: user.username,
  fullName: user.full_name,
  email: user.email,
  profileUid: user.profile_uid,
});

interface TaskCommentsProps {
  caseId: string;
  taskId: string;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ caseId, taskId }) => {
  const { permissions } = useCasesContext();
  const { data, isLoading, isError, refetch } = useGetTaskComments(caseId, taskId);
  const { mutateAsync: addComment, isLoading: isAdding } = useAddTaskComment(caseId, taskId);
  const { mutateAsync: deleteComment, isLoading: isDeleting } = useDeleteTaskComment(
    caseId,
    taskId
  );
  const [draft, setDraft] = useState('');
  const [deleting, setDeleting] = useState<CaseTaskComment | null>(null);
  const modalTitleId = useGeneratedHtmlId();

  const comments = useMemo(() => data?.comments ?? [], [data?.comments]);
  const uids = useMemo(
    () => [
      ...new Set(
        comments.flatMap((c) => (c.created_by.profile_uid ? [c.created_by.profile_uid] : []))
      ),
    ],
    [comments]
  );
  const { data: profiles } = useBulkGetUserProfiles({ uids });

  const submit = async () => {
    const comment = draft.trim();
    if (!comment) return;
    await addComment(comment);
    setDraft('');
  };

  let thread: React.ReactNode;
  if (isLoading) {
    thread = <EuiSkeletonText lines={3} data-test-subj="cases-task-comments-loading" />;
  } else if (isError) {
    thread = (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={i18n.COMMENTS_LOAD_ERROR}
        data-test-subj="cases-task-comments-error"
      >
        <EuiLink onClick={() => refetch()}>{i18n.TRY_AGAIN}</EuiLink>
      </EuiCallOut>
    );
  } else if (comments.length === 0) {
    thread = (
      <EuiEmptyPrompt
        titleSize="xxs"
        paddingSize="s"
        title={<h4>{i18n.NO_COMMENTS_TITLE}</h4>}
        body={permissions.createComment ? <p>{i18n.NO_COMMENTS_BODY}</p> : undefined}
        data-test-subj="cases-task-comments-empty"
      />
    );
  } else {
    thread = (
      <EuiFlexGroup direction="column" gutterSize="s" component="ul" css={{ listStyle: 'none' }}>
        {comments.map((comment) => (
          <EuiFlexItem key={comment.id} component="li">
            <EuiPanel hasBorder paddingSize="s" data-test-subj={`cases-task-comment-${comment.id}`}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                    <EuiFlexItem grow={false}>
                      <HoverableUserWithAvatarResolver
                        user={toCaseUser(comment.created_by)}
                        userProfiles={profiles}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <UserActionTimestamp createdAt={comment.created_at} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {permissions.delete && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={i18n.DELETE_COMMENT} disableScreenReaderOutput>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        aria-label={i18n.DELETE_COMMENT_ARIA(
                          comment.created_by.full_name ?? comment.created_by.username ?? ''
                        )}
                        onClick={() => setDeleting(comment)}
                        data-test-subj={`cases-task-comment-delete-${comment.id}`}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <MarkdownRenderer textSize="s">{comment.comment}</MarkdownRenderer>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  return (
    <div data-test-subj="cases-task-comments">
      <EuiTitle size="xxs">
        <h3>{i18n.COMMENTS(data?.total ?? 0)}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {thread}
      {permissions.createComment && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow label={i18n.COMMENT_LABEL} fullWidth>
            <EuiTextArea
              fullWidth
              rows={3}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder={i18n.COMMENT_PLACEHOLDER}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              data-test-subj="cases-task-comment-input"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                isLoading={isAdding}
                isDisabled={draft.trim() === ''}
                onClick={submit}
                data-test-subj="cases-task-comment-submit"
              >
                {i18n.ADD_COMMENT}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {deleting && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={i18n.DELETE_COMMENT_TITLE}
          buttonColor="danger"
          cancelButtonText={i18n.CANCEL}
          confirmButtonText={i18n.DELETE_COMMENT}
          isLoading={isDeleting}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteComment(deleting.id);
            setDeleting(null);
          }}
          data-test-subj="cases-task-comment-delete-modal"
        >
          {i18n.DELETE_COMMENT_BODY}
        </EuiConfirmModal>
      )}
    </div>
  );
};

TaskComments.displayName = 'TaskComments';
