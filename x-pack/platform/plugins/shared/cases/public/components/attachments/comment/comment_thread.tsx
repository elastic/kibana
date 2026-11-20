/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import type { AttachmentUIV2, CaseUser } from '../../../containers/types';
import { LocalizedDateTooltip } from '../../localized_date_tooltip';
import { CaseUserAvatar } from '../../user_profiles/user_avatar';
import { convertToCaseUser, convertToUserInfo } from '../../user_profiles/user_converter';
import { useGetReplies, useGetReplyCounts } from '../../../containers/threads/hooks';
import { useDeleteComment } from '../../../containers/use_delete_comment';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { MarkdownRenderer } from '../../markdown_editor';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionTimestamp } from '../../user_actions/timestamp';
import { DeleteAttachmentConfirmationModal } from '../../user_actions/delete_attachment_confirmation_modal';
import { useCommentRenderingContext } from '../../user_actions/comment/comment_rendering_context';
import { DELETE } from '../../user_actions/translations';
import { ReplyComposer } from './reply_composer';
import { closeThread, setOpenThread, useOpenThreadId } from './thread_store';
import { useIsAuthor } from './use_is_author';
import * as i18n from './translations';

const getReplyContent = (reply: AttachmentUIV2): string => {
  if ('data' in reply && reply.data != null && typeof reply.data.content === 'string') {
    return reply.data.content;
  }
  return '';
};

const ThreadMessageHeader: React.FC<{
  createdBy: CaseUser;
  createdAt: string;
  updatedAt?: string | null;
  children?: React.ReactNode;
}> = ({ createdBy, createdAt, updatedAt, children }) => {
  const { userProfiles = new Map() } = useCommentRenderingContext();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <HoverableUserWithAvatarResolver user={createdBy} userProfiles={userProfiles} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <UserActionTimestamp createdAt={createdAt} updatedAt={updatedAt} />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem />
      {children}
    </EuiFlexGroup>
  );
};

ThreadMessageHeader.displayName = 'ThreadMessageHeader';

const ReplyItem: React.FC<{ caseId: string; reply: AttachmentUIV2 }> = ({ caseId, reply }) => {
  const { permissions } = useCasesContext();
  const [isConfirming, setIsConfirming] = useState(false);
  const { mutate: deleteComment, isLoading } = useDeleteComment();
  const isAuthor = useIsAuthor(reply.createdBy);
  const canDelete = permissions.delete && isAuthor;

  const onConfirmDelete = useCallback(() => {
    setIsConfirming(false);
    deleteComment({
      caseId,
      commentId: reply.id,
      successToasterTitle: i18n.DELETE_REPLY_SUCCESS_TOAST,
    });
  }, [caseId, deleteComment, reply.id]);

  return (
    <div data-test-subj={`comment-reply-${reply.id}`}>
      <ThreadMessageHeader
        createdBy={reply.createdBy}
        createdAt={reply.createdAt}
        updatedAt={reply.updatedAt}
      >
        {canDelete ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.DELETE_REPLY} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                size="xs"
                aria-label={i18n.DELETE_REPLY}
                isLoading={isLoading}
                onClick={() => setIsConfirming(true)}
                data-test-subj={`comment-reply-delete-${reply.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </ThreadMessageHeader>
      <EuiSpacer size="s" />
      <MarkdownRenderer textSize="s">{getReplyContent(reply)}</MarkdownRenderer>
      {isConfirming ? (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_REPLY_TITLE}
          confirmButtonText={DELETE}
          onCancel={() => setIsConfirming(false)}
          onConfirm={onConfirmDelete}
        />
      ) : null}
    </div>
  );
};

ReplyItem.displayName = 'ReplyItem';

export interface ThreadParent {
  id: string;
  content: string;
  createdBy: CaseUser;
  createdAt: string;
}

const CommentThreadFlyout: React.FC<{ caseId: string; parent: ThreadParent }> = ({
  caseId,
  parent,
}) => {
  const titleId = useGeneratedHtmlId();
  const { permissions } = useCasesContext();
  const { data: replies = [], isLoading } = useGetReplies({
    caseId,
    parentId: parent.id,
    isEnabled: true,
  });
  const canReply = permissions.createComment;
  const onClose = useCallback(() => setOpenThread(null), []);

  return (
    <EuiFlyout
      size="s"
      type="overlay"
      ownFocus={false}
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj={`comment-thread-flyout-${parent.id}`}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{i18n.THREAD_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ThreadMessageHeader createdBy={parent.createdBy} createdAt={parent.createdAt} />
        <EuiSpacer size="s" />
        <MarkdownRenderer textSize="s">{parent.content}</MarkdownRenderer>
        <EuiHorizontalRule margin="m" />
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : replies.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.NO_REPLIES}
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            {replies.map((reply) => (
              <EuiFlexItem grow={false} key={reply.id}>
                <ReplyItem caseId={caseId} reply={reply} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
      {canReply ? (
        <EuiFlyoutFooter>
          <ReplyComposer caseId={caseId} parentId={parent.id} autoFocus />
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
};

CommentThreadFlyout.displayName = 'CommentThreadFlyout';

/** Icon button of the comment toolbar that opens its thread. */
export const ReplyButton: React.FC<{ commentId: string }> = ({ commentId }) => {
  const { permissions } = useCasesContext();

  if (!permissions.createComment) {
    return null;
  }

  return (
    <EuiToolTip position="top" content={i18n.REPLY_IN_THREAD} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="comment"
        aria-label={i18n.REPLY_IN_THREAD}
        onClick={() => setOpenThread(commentId)}
        data-test-subj={`comment-thread-reply-${commentId}`}
      />
    </EuiToolTip>
  );
};

ReplyButton.displayName = 'ReplyButton';

/** Reply count link under a comment, and the flyout of its thread when open. */
export const CommentThread: React.FC<{ caseId: string; parent: ThreadParent }> = ({
  caseId,
  parent,
}) => {
  const { euiTheme } = useEuiTheme();
  const { userProfiles = new Map() } = useCommentRenderingContext();
  const { data: replyCounts } = useGetReplyCounts(caseId);
  const replyCount = replyCounts?.counts[parent.id] ?? 0;
  const summary = replyCounts?.threads[parent.id];
  const isOpen = useOpenThreadId() === parent.id;

  useEffect(() => () => closeThread(parent.id), [parent.id]);

  return (
    <>
      {replyCount > 0 ? (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          css={css({ padding: `0 ${euiTheme.size.s} ${euiTheme.size.s}` })}
          data-test-subj={`comment-thread-summary-${parent.id}`}
        >
          {summary?.participants.length ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                {summary.participants.map((participant) => {
                  const { userInfo } = convertToUserInfo(
                    convertToCaseUser(participant),
                    userProfiles
                  ) ?? {
                    userInfo: undefined,
                  };
                  return (
                    <EuiFlexItem grow={false} key={participant.profile_uid ?? participant.username}>
                      <CaseUserAvatar size="s" userInfo={userInfo} />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="both"
              onClick={() => setOpenThread(parent.id)}
              data-test-subj={`comment-thread-toggle-${parent.id}`}
            >
              <strong>{i18n.getRepliesCount(replyCount)}</strong>
            </EuiButtonEmpty>
          </EuiFlexItem>
          {summary?.lastReplyAt != null ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.cases.attachments.comment.thread.lastReply"
                  defaultMessage="Last reply {time}"
                  values={{
                    time: (
                      <LocalizedDateTooltip date={new Date(summary.lastReplyAt)}>
                        <FormattedRelative value={summary.lastReplyAt} />
                      </LocalizedDateTooltip>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : null}
      {isOpen ? <CommentThreadFlyout caseId={caseId} parent={parent} /> : null}
    </>
  );
};

CommentThread.displayName = 'CommentThread';
