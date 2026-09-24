/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MAX_CHARS = 500;

interface CommentBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export const CommentBox: React.FC<CommentBoxProps> = ({ value, onChange }) => {
  const remaining = MAX_CHARS - value.length;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.agentBuilder.feedback.commentLabel', {
            defaultMessage: 'Add comment',
          })}
          helpText={
            <EuiText size="xs" color={remaining < 50 ? 'warning' : 'subdued'} textAlign="right">
              {remaining}
            </EuiText>
          }
          fullWidth
        >
          <EuiTextArea
            placeholder={i18n.translate('xpack.agentBuilder.feedback.commentPlaceholder', {
              defaultMessage: 'Add a comment (optional)',
            })}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, MAX_CHARS))}
            rows={4}
            resize="vertical"
            fullWidth
            data-test-subj="roundFeedbackCommentInput"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCallOut size="s" color="primary" iconType="info">
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.feedback.commentDisclosure', {
              defaultMessage: 'Your comment and metadata will be shared with Elastic.',
            })}{' '}
            <EuiLink href="https://www.elastic.co/legal/privacy-statement" target="_blank" external>
              {i18n.translate('xpack.agentBuilder.feedback.commentDisclosurePrivacyLink', {
                defaultMessage: 'Privacy statement',
              })}
            </EuiLink>
          </EuiText>
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
