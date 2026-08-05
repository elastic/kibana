/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTextArea, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export const MAX_CHARS = 500;

interface CommentBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export const CommentBox: React.FC<CommentBoxProps> = ({ value, onChange }) => {
  const remaining = MAX_CHARS - value.length;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiTextArea
          placeholder={i18n.translate('xpack.agentBuilder.feedback.commentPlaceholder', {
            defaultMessage: 'Add a comment (optional)',
          })}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          resize="vertical"
          fullWidth
          data-test-subj="roundFeedbackCommentInput"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="xs"
          color={remaining < 50 ? 'warning' : 'subdued'}
          css={css`
            text-align: right;
          `}
        >
          {remaining}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
