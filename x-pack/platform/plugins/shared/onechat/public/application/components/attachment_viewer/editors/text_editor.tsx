/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentEditorProps } from '@kbn/onechat-browser';
import type { TextAttachmentData } from '@kbn/onechat-common/attachments';

/**
 * Dedicated editor for text attachments.
 * Provides a textarea for editing plain text content with character/line counts.
 */
// Helper to extract content from attachment data
// Handles both { content: string } and raw string formats
const getTextContent = (data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object' && 'content' in data) {
    return (data as TextAttachmentData).content ?? '';
  }
  return '';
};

export const TextAttachmentEditor: React.FC<AttachmentEditorProps> = ({
  version,
  onChange,
  onSave,
  onCancel,
}) => {
  const textContent = getTextContent(version.data);
  const [content, setContent] = useState(textContent);
  const [isDirty, setIsDirty] = useState(false);

  // Reset when version changes
  useEffect(() => {
    setContent(getTextContent(version.data));
    setIsDirty(false);
  }, [version.data]);

  // Handle content changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      setIsDirty(true);
      onChange({ content: newContent });
    },
    [onChange]
  );

  // Calculate stats
  const charCount = content.length;
  const lineCount = content.split('\n').length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiTextArea
          fullWidth
          value={content}
          onChange={handleChange}
          rows={20}
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.4',
          }}
          aria-label={i18n.translate('xpack.onechat.editors.textEditor.ariaLabel', {
            defaultMessage: 'Edit text attachment content',
          })}
          data-test-subj="textAttachmentEditor"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.onechat.editors.textEditor.stats', {
                defaultMessage: '{chars} characters, {words} words, {lines} lines',
                values: { chars: charCount, words: wordCount, lines: lineCount },
              })}
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel} size="s">
                  {i18n.translate('xpack.onechat.editors.textEditor.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onSave} fill size="s" disabled={!isDirty}>
                  {i18n.translate('xpack.onechat.editors.textEditor.save', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
