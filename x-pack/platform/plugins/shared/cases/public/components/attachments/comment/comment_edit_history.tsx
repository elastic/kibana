/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { UserActionUI } from '../../../../common/ui/types';
import { useGetAttachmentHistory } from '../../../containers/use_get_attachment_history';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { MarkdownRenderer } from '../../markdown_editor';
import { ContentDiff } from './content_diff';
import {
  CURRENT_VERSION,
  EDIT_HISTORY_ARIA_LABEL,
  LAST_EDITED,
  getLastEditedBy,
  EDIT_HISTORY_TITLE,
  ORIGINAL_VERSION,
} from './translations';

interface CommentEditHistoryProps {
  caseId: string;
  commentId: string;
  editedBy: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Reads the comment text from a unified (`data.content`) or legacy (`comment`) payload. */
const getContent = (userAction: UserActionUI): string => {
  const { payload } = userAction;
  if (!('comment' in payload)) {
    return '';
  }

  const comment: unknown = payload.comment;
  if (!isRecord(comment)) {
    return '';
  }

  if (isRecord(comment.data) && typeof comment.data.content === 'string') {
    return comment.data.content;
  }

  return typeof comment.comment === 'string' ? comment.comment : '';
};

const popoverCss = css`
  max-width: 480px;
  max-height: 420px;
  overflow-y: auto;
`;

export const CommentEditHistory: React.FC<CommentEditHistoryProps> = ({
  caseId,
  commentId,
  editedBy,
}) => {
  const titleId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);
  const close = useCallback(() => setIsOpen(false), []);

  const { data: history, isLoading } = useGetAttachmentHistory({
    caseId,
    attachmentId: commentId,
    isEnabled: isOpen,
  });

  // Newest first, so the current text is on top.
  const versions = [...(history ?? [])].reverse();

  return (
    <EuiPopover
      aria-labelledby={titleId}
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="downLeft"
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={toggle}
          aria-label={EDIT_HISTORY_ARIA_LABEL}
          data-test-subj={`comment-edit-history-button-${commentId}`}
        >
          {editedBy ? getLastEditedBy(editedBy) : LAST_EDITED}
        </EuiButtonEmpty>
      }
    >
      <EuiPopoverTitle id={titleId}>{EDIT_HISTORY_TITLE}</EuiPopoverTitle>
      <div css={popoverCss} data-test-subj={`comment-edit-history-${commentId}`}>
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          versions.map((version, index) => (
            <React.Fragment key={version.id}>
              {index > 0 && <EuiHorizontalRule margin="s" />}
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>{version.createdBy.fullName ?? version.createdBy.username}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <FormattedRelativePreferenceDate value={version.createdAt} stripMs />
                  </EuiText>
                </EuiFlexItem>
                {index === 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary">{CURRENT_VERSION}</EuiBadge>
                  </EuiFlexItem>
                )}
                {index === versions.length - 1 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default">{ORIGINAL_VERSION}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
                {index < versions.length - 1 ? (
                  <ContentDiff
                    previous={getContent(versions[index + 1])}
                    current={getContent(version)}
                  />
                ) : (
                  <MarkdownRenderer textSize="xs" disableLinks>
                    {getContent(version)}
                  </MarkdownRenderer>
                )}
              </EuiPanel>
            </React.Fragment>
          ))
        )}
      </div>
    </EuiPopover>
  );
};

CommentEditHistory.displayName = 'CommentEditHistory';
