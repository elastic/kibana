/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import type { CommentItem, InvestigationItem } from '../../../../common/investigations/types';
import { MarkdownEditor, MarkdownRenderer } from '../../../components/markdown_editor';
import { useBulkCreateItems, useItems } from '../../hooks';
import { ICONS } from '../../icons';
import { ActorBadge } from '../shared/actor_badge';
import { RelativeTime } from '../shared/relative_time';
import * as i18n from './translations';

const DISABLED_UI_PLUGINS = ['lens'];

const isComment = (item: InvestigationItem): item is CommentItem => item.kind === 'comment';

export interface ClaimCommentsProps {
  recordId: string;
  claimId: string;
  /** False when the record is closed. */
  canComment: boolean;
}

/** Formatted comments on a claim, oldest first, with a Markdown composer. */
export const ClaimComments: React.FC<ClaimCommentsProps> = ({ recordId, claimId, canComment }) => {
  const editorId = useGeneratedHtmlId({ prefix: 'investigationClaimCommentEditorId' });
  const [draft, setDraft] = useState('');
  const { data, isLoading, isError } = useItems(recordId, {
    kind: ['comment'],
    target_id: claimId,
    sort_field: 'created_at',
    sort_order: 'asc',
    per_page: 100,
  });
  const { mutateAsync, isLoading: isSaving } = useBulkCreateItems(recordId);
  const comments = (data?.items ?? []).filter(isComment);

  const submit = async () => {
    const text = draft.trim();
    if (text.length === 0) {
      return;
    }
    try {
      await mutateAsync({
        items: [{ kind: 'comment', text, comment: { target_id: claimId } }],
        extract_indicators: false,
      });
      setDraft('');
    } catch {
      // The mutation reports the error; the draft stays so nothing is lost.
    }
  };

  return (
    <div data-test-subj="investigationClaimComments">
      {isLoading ? <EuiLoadingSpinner size="m" /> : null}
      {isError ? (
        <EuiCallOut announceOnMount size="s" color="danger" title={i18n.COMMENTS_ERROR} />
      ) : null}
      {!isLoading && !isError && comments.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="investigationClaimNoComments">
          {i18n.NO_COMMENTS}
        </EuiText>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="m">
        {comments.map((comment) => (
          <EuiFlexItem key={comment.id} data-test-subj="investigationClaimComment">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <ActorBadge actor={comment.created_by} compact />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <RelativeTime value={comment.created_at} />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <MarkdownRenderer textSize="s">{comment.text ?? ''}</MarkdownRenderer>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {canComment ? (
        <>
          <EuiSpacer size="m" />
          <MarkdownEditor
            ariaLabel={i18n.COMMENT_ARIA}
            editorId={editorId}
            value={draft}
            onChange={(value) => setDraft(value.slice(0, INVESTIGATION_LIMITS.maxTextLength))}
            height={140}
            disabledUiPlugins={DISABLED_UI_PLUGINS}
            data-test-subj="investigationClaimCommentEditor"
          />
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            iconType={ICONS.send}
            isDisabled={draft.trim().length === 0}
            isLoading={isSaving}
            onClick={() => void submit()}
            data-test-subj="investigationClaimCommentSubmit"
          >
            {i18n.COMMENT}
          </EuiButton>
        </>
      ) : null}
    </div>
  );
};
ClaimComments.displayName = 'ClaimComments';
