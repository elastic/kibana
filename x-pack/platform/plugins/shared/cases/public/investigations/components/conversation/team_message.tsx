/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { css } from '@emotion/react';
import type { InvestigationRecord, RecordComment } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { MarkdownEditor, MarkdownRenderer } from '../../../components/markdown_editor';
import { HoverableUserWithAvatarResolver } from '../../../components/user_profiles/hoverable_user_with_avatar_resolver';
import {
  getHttpErrorStatus,
  useDeleteComment,
  useInvestigationToasts,
  useUpdateComment,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal, RelativeTime } from '../shared';
import type { PinnedClaim } from './use_claim_sources';
import * as i18n from './translations';

const DISABLED_UI_PLUGINS = ['lens'];

export interface TeamMessageProps {
  record: InvestigationRecord;
  comment: RecordComment;
  userProfiles: Map<string, UserProfileWithAvatar> | undefined;
  /** Edit and delete are offered on the viewer's own comments. */
  isOwn: boolean;
  pinned: PinnedClaim | undefined;
  onPin: (comment: RecordComment) => void;
  onReply: (comment: RecordComment) => void;
  onQuote: (comment: RecordComment) => void;
  compact: boolean;
}

/** One comment: author, time, Markdown body and the Cases comment actions. */
export const TeamMessage: React.FC<TeamMessageProps> = ({
  record,
  comment,
  userProfiles,
  isOwn,
  pinned,
  onPin,
  onReply,
  onQuote,
  compact,
}) => {
  const { euiTheme } = useEuiTheme();
  const { showSuccess } = useInvestigationToasts();
  const editorId = useGeneratedHtmlId({ prefix: 'investigationTeamEditEditor' });
  const update = useUpdateComment(record.id);
  const remove = useDeleteComment(record.id);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  const { created_by: author, content, updated_at: updatedAt } = comment;
  const isEdited = Boolean(updatedAt) && updatedAt !== comment.created_at;

  const copy = () => {
    void navigator.clipboard?.writeText(content).then(() => showSuccess(i18n.COPIED));
  };

  const startEditing = () => {
    setDraft(content);
    setHasConflict(false);
    setIsEditing(true);
  };

  const stopEditing = () => {
    setIsEditing(false);
    setHasConflict(false);
  };

  const save = () => {
    const next = draft.trim();
    if (next.length === 0 || update.isLoading) {
      return;
    }
    if (next === content) {
      stopEditing();
      return;
    }
    update
      .mutateAsync({ commentId: comment.id, content: next, version: comment.version })
      .then(() => {
        stopEditing();
        showSuccess(i18n.COMMENT_UPDATED);
      })
      .catch((error: unknown) => {
        if (getHttpErrorStatus(error) === 409) {
          setHasConflict(true);
        }
      });
  };

  const confirmDelete = () => {
    remove
      .mutateAsync(comment.id)
      .then(() => {
        setIsDeleting(false);
        showSuccess(i18n.COMMENT_DELETED);
      })
      .catch(() => setIsDeleting(false));
  };

  return (
    <div
      css={css`
        padding-block: ${euiTheme.size.s};
      `}
      data-test-subj="investigationTeamThread"
    >
      <div data-test-subj={`investigationTeamMessage-${comment.id}`}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <HoverableUserWithAvatarResolver
              user={{
                username: author.username ?? null,
                fullName: author.full_name ?? null,
                email: null,
                profileUid: author.profile_uid ?? undefined,
              }}
              userProfiles={userProfiles}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <RelativeTime value={comment.created_at} />
            </EuiText>
          </EuiFlexItem>
          {isEdited ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="investigationTeamMessageEdited">
                {i18n.EDITED}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {pinned ? (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="success"
                iconType={ICONS.pinned}
                data-test-subj="investigationTeamMessagePinned"
              >
                {i18n.PINNED(pinned.ref)}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <div
          css={css`
            margin-block-start: ${euiTheme.size.xs};
            padding-inline-start: ${compact ? 0 : euiTheme.size.xl};
            overflow-wrap: anywhere;
          `}
        >
          {isEditing ? (
            <div data-test-subj="investigationTeamEdit">
              <MarkdownEditor
                ariaLabel={i18n.EDIT_COMMENT}
                editorId={editorId}
                value={draft}
                onChange={(value) => setDraft(value.slice(0, INVESTIGATION_LIMITS.maxTextLength))}
                height={100}
                disabledUiPlugins={DISABLED_UI_PLUGINS}
                data-test-subj="investigationTeamEditInput"
              />
              {hasConflict ? (
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  iconType={ICONS.warning}
                  title={i18n.COMMENT_CONFLICT_TITLE}
                  css={css`
                    margin-block-start: ${euiTheme.size.s};
                  `}
                  text={<p>{i18n.COMMENT_CONFLICT_BODY}</p>}
                  actionProps={{
                    primary: {
                      children: i18n.COMMENT_CONFLICT_DISCARD,
                      onClick: stopEditing,
                      'data-test-subj': 'investigationTeamEditDiscard',
                    },
                  }}
                  data-test-subj="investigationTeamEditConflict"
                />
              ) : null}
              <EuiFlexGroup
                gutterSize="s"
                justifyContent="flexEnd"
                responsive={false}
                css={css`
                  margin-block-start: ${euiTheme.size.s};
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    onClick={stopEditing}
                    data-test-subj="investigationTeamEditCancel"
                  >
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    isLoading={update.isLoading}
                    isDisabled={draft.trim().length === 0 || hasConflict}
                    onClick={save}
                    data-test-subj="investigationTeamEditSave"
                  >
                    {i18n.SAVE}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          ) : (
            <>
              <div data-test-subj="investigationTeamMessageBody">
                <MarkdownRenderer textSize="s">{content}</MarkdownRenderer>
              </div>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType={ICONS.thread}
                    onClick={() => onReply(comment)}
                    data-test-subj="investigationTeamMessageReply"
                  >
                    {i18n.REPLY}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    aria-label={i18n.QUOTE_ARIA}
                    onClick={() => onQuote(comment)}
                    data-test-subj="investigationTeamMessageQuote"
                  >
                    {i18n.QUOTE}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {pinned ? null : (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      iconType={ICONS.pin}
                      aria-label={i18n.PIN_AS_CLAIM_ARIA}
                      onClick={() => onPin(comment)}
                      data-test-subj="investigationTeamMessagePin"
                    >
                      {i18n.PIN_AS_CLAIM}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.COPY_MESSAGE} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType={ICONS.copy}
                      size="xs"
                      color="text"
                      aria-label={i18n.COPY_MESSAGE}
                      onClick={copy}
                      data-test-subj="investigationTeamMessageCopy"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                {isOwn ? (
                  <>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={i18n.EDIT_COMMENT} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType={ICONS.edit}
                          size="xs"
                          color="text"
                          aria-label={i18n.EDIT_COMMENT}
                          onClick={startEditing}
                          data-test-subj="investigationTeamMessageEdit"
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={i18n.DELETE_COMMENT} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType={ICONS.trash}
                          size="xs"
                          color="danger"
                          aria-label={i18n.DELETE_COMMENT}
                          onClick={() => setIsDeleting(true)}
                          data-test-subj="investigationTeamMessageDelete"
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </>
                ) : null}
              </EuiFlexGroup>
            </>
          )}
        </div>
      </div>
      {isDeleting ? (
        <ConfirmModal
          title={i18n.DELETE_COMMENT_TITLE}
          body={<p>{i18n.DELETE_COMMENT_BODY}</p>}
          confirmLabel={i18n.DELETE}
          destructive
          isLoading={remove.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => setIsDeleting(false)}
          data-test-subj="investigationTeamDeleteModal"
        />
      ) : null}
    </div>
  );
};
TeamMessage.displayName = 'TeamMessage';
