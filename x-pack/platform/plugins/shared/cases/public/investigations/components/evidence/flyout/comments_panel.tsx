/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CommentItem } from '../../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { MarkdownEditor, MarkdownRenderer } from '../../../../components/markdown_editor';
import {
  useBulkCreateItems,
  useBulkDeleteItems,
  useInvestigationToasts,
  useUpdateItem,
} from '../../../hooks';
import { ICONS } from '../../../icons';
import { ActorBadge } from '../../shared/actor_badge';
import { ConfirmModal } from '../../shared/confirm_modal';
import { RelativeTime } from '../../shared/relative_time';
import { ErrorState } from '../../shared/error_state';
import { LoadingState } from '../../shared/loading_state';
import { useCurrentUsername, useItemComments } from '../use_evidence_queries';
import * as i18n from '../translations';

const DISABLED_UI_PLUGINS = ['lens'];

const clamp = (value: string): string => value.slice(0, INVESTIGATION_LIMITS.maxTextLength);

const CommentRow: React.FC<{
  comment: CommentItem;
  recordId: string;
  isOwn: boolean;
}> = ({ comment, recordId, isOwn }) => {
  const { euiTheme } = useEuiTheme();
  const editorId = useGeneratedHtmlId({ prefix: 'investigationEvidenceCommentEditorId' });
  const updateItem = useUpdateItem(recordId);
  const bulkDelete = useBulkDeleteItems(recordId);
  const { showSuccess } = useInvestigationToasts();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text ?? '');
  const [isDeleting, setIsDeleting] = useState(false);

  const save = () => {
    if (!comment.version || draft.trim().length === 0) {
      return;
    }
    updateItem
      .mutateAsync({ itemId: comment.id, patch: { text: draft.trim() }, version: comment.version })
      .then(() => {
        setIsEditing(false);
        showSuccess(i18n.COMMENT_UPDATED);
      })
      .catch(() => undefined);
  };

  const remove = () => {
    bulkDelete
      .mutateAsync({ ids: [comment.id] })
      .then(() => {
        setIsDeleting(false);
        showSuccess(i18n.COMMENT_DELETED);
      })
      .catch(() => undefined);
  };

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder
      data-test-subj={`investigationEvidenceComment-${comment.ref}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <ActorBadge actor={comment.created_by} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <RelativeTime value={comment.created_at} />
            {comment.updated_at !== comment.created_at ? ` ${i18n.COMMENT_EDITED}` : ''}
          </EuiText>
        </EuiFlexItem>
        {isOwn && !isEditing ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.EDIT_COMMENT} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.edit}
                  aria-label={i18n.EDIT_COMMENT}
                  onClick={() => {
                    setDraft(comment.text ?? '');
                    setIsEditing(true);
                  }}
                  data-test-subj="investigationEvidenceCommentEdit"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.DELETE_COMMENT} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={ICONS.trash}
                  color="danger"
                  aria-label={i18n.DELETE_COMMENT}
                  onClick={() => setIsDeleting(true)}
                  data-test-subj="investigationEvidenceCommentDelete"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
      <div
        css={css`
          margin-block-start: ${euiTheme.size.s};
        `}
      >
        {isEditing ? (
          <>
            <MarkdownEditor
              ariaLabel={i18n.EDIT_COMMENT}
              editorId={editorId}
              value={draft}
              onChange={(value) => setDraft(clamp(value))}
              height={140}
              disabledUiPlugins={DISABLED_UI_PLUGINS}
              data-test-subj="investigationEvidenceCommentEditor"
            />
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={() => setIsEditing(false)}
                  data-test-subj="investigationEvidenceCommentEditCancel"
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  isLoading={updateItem.isLoading}
                  isDisabled={draft.trim().length === 0}
                  onClick={save}
                  data-test-subj="investigationEvidenceCommentEditSave"
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <MarkdownRenderer textSize="s">{comment.text ?? ''}</MarkdownRenderer>
        )}
      </div>
      {isDeleting ? (
        <ConfirmModal
          title={i18n.DELETE_COMMENT_TITLE}
          body={<p>{i18n.DELETE_COMMENT_BODY}</p>}
          confirmLabel={i18n.DELETE}
          destructive
          isLoading={bulkDelete.isLoading}
          onConfirm={remove}
          onCancel={() => setIsDeleting(false)}
          data-test-subj="investigationEvidenceCommentDeleteModal"
        />
      ) : null}
    </EuiPanel>
  );
};
CommentRow.displayName = 'CommentRow';

export interface CommentsPanelProps {
  recordId: string;
  itemId: string;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ recordId, itemId }) => {
  const { comments, isLoading, error } = useItemComments(recordId, itemId);
  const username = useCurrentUsername();
  const bulkCreate = useBulkCreateItems(recordId);
  const { showSuccess } = useInvestigationToasts();
  const composerId = useGeneratedHtmlId({ prefix: 'investigationEvidenceCommentComposerId' });
  const [draft, setDraft] = useState('');

  const post = () => {
    const text = draft.trim();
    if (text.length === 0) {
      return;
    }
    bulkCreate
      .mutateAsync({ items: [{ kind: 'comment', text, comment: { target_id: itemId } }] })
      .then(() => {
        setDraft('');
        showSuccess(i18n.COMMENT_ADDED);
      })
      .catch(() => undefined);
  };

  if (isLoading) {
    return <LoadingState label={i18n.COMMENTS_LOADING} size="m" />;
  }
  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div data-test-subj="investigationEvidenceComments">
      {comments.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="investigationEvidenceCommentsEmpty">
          <p>{i18n.NO_COMMENTS}</p>
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          {comments.map((comment) => (
            <EuiFlexItem key={comment.id}>
              <CommentRow
                comment={comment}
                recordId={recordId}
                isOwn={comment.created_by.type === 'user' && comment.created_by.id === username}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="m" />
      <MarkdownEditor
        ariaLabel={i18n.ADD_COMMENT}
        editorId={composerId}
        value={draft}
        onChange={(value) => setDraft(clamp(value))}
        height={140}
        disabledUiPlugins={DISABLED_UI_PLUGINS}
        data-test-subj="investigationEvidenceCommentComposer"
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="s"
            isLoading={bulkCreate.isLoading}
            isDisabled={draft.trim().length === 0}
            onClick={post}
            data-test-subj="investigationEvidenceCommentPost"
          >
            {i18n.COMMENT}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
CommentsPanel.displayName = 'CommentsPanel';
