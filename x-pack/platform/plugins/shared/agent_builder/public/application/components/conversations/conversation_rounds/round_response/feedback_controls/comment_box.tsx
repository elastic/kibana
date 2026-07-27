/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTextArea } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MAX_CHARS = 500;

const labels = {
  placeholder: i18n.translate('xpack.agentBuilder.feedback.commentPlaceholder', {
    defaultMessage: 'Add a comment (optional)',
  }),
  submit: i18n.translate('xpack.agentBuilder.feedback.submit', { defaultMessage: 'Submit' }),
  cancel: i18n.translate('xpack.agentBuilder.feedback.cancel', { defaultMessage: 'Cancel' }),
};

interface CommentBoxProps {
  onSubmit: (comment: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const CommentBox: React.FC<CommentBoxProps> = ({ onSubmit, onCancel, isSubmitting }) => {
  const [comment, setComment] = useState('');
  const remaining = MAX_CHARS - comment.length;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiTextArea
          placeholder={labels.placeholder}
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          resize="vertical"
          fullWidth
          data-test-subj="roundFeedbackCommentInput"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <span
              css={css`
                font-size: 0.75rem;
                opacity: 0.6;
              `}
            >
              {remaining}
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" onClick={onCancel} isDisabled={isSubmitting}>
                  {labels.cancel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                  onClick={() => onSubmit(comment)}
                  data-test-subj="roundFeedbackSubmitButton"
                >
                  {labels.submit}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
