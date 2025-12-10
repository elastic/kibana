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
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiFieldText,
  EuiFormRow,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentEditorProps } from '@kbn/onechat-browser';
import type { EsqlAttachmentData } from '@kbn/onechat-common/attachments';

/**
 * Dedicated editor for ES|QL attachments.
 * Provides a code editor with syntax highlighting for ES|QL queries.
 * Note: We use a simple textarea with monospace font as a fallback.
 * For full ES|QL language support, consider integrating ESQLLangEditor
 * from @kbn/esql/public in a future enhancement.
 */
export const EsqlAttachmentEditor: React.FC<AttachmentEditorProps> = ({
  version,
  onChange,
  onSave,
  onCancel,
}) => {
  const { euiTheme } = useEuiTheme();
  const data = version.data as EsqlAttachmentData;

  const [query, setQuery] = useState(data.query);
  const [description, setDescription] = useState(data.description || '');
  const [isDirty, setIsDirty] = useState(false);

  // Reset when version changes
  useEffect(() => {
    setQuery(data.query);
    setDescription(data.description || '');
    setIsDirty(false);
  }, [data.query, data.description]);

  // Handle query changes
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      setIsDirty(true);
      onChange({ query: newQuery, description: description || undefined });
    },
    [onChange, description]
  );

  // Handle description changes
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDescription = e.target.value;
      setDescription(newDescription);
      setIsDirty(true);
      onChange({ query, description: newDescription || undefined });
    },
    [onChange, query]
  );

  const editorStyles = css`
    font-family: ${euiTheme.font.familyCode};
    font-size: 13px;
    line-height: 1.5;
    background-color: ${euiTheme.colors.lightestShade};
    padding: ${euiTheme.size.m};
    border: 1px solid ${euiTheme.border.color};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  // Calculate line count
  const lineCount = query.split('\n').length;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.editors.esqlEditor.descriptionLabel', {
            defaultMessage: 'Description (optional)',
          })}
          fullWidth
        >
          <EuiFieldText
            value={description}
            onChange={handleDescriptionChange}
            placeholder={i18n.translate(
              'xpack.onechat.editors.esqlEditor.descriptionPlaceholder',
              {
                defaultMessage: 'Enter a description for this query',
              }
            )}
            fullWidth
            data-test-subj="esqlEditorDescription"
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate('xpack.onechat.editors.esqlEditor.queryLabel', {
            defaultMessage: 'ES|QL Query',
          })}
          fullWidth
          helpText={i18n.translate('xpack.onechat.editors.esqlEditor.queryHelp', {
            defaultMessage: '{lines} lines',
            values: { lines: lineCount },
          })}
        >
          <EuiTextArea
            value={query}
            onChange={handleQueryChange}
            rows={15}
            css={editorStyles}
            aria-label={i18n.translate('xpack.onechat.editors.esqlEditor.ariaLabel', {
              defaultMessage: 'Edit ES|QL query',
            })}
            data-test-subj="esqlEditorQuery"
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} size="s">
              {i18n.translate('xpack.onechat.editors.esqlEditor.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill size="s" disabled={!isDirty}>
              {i18n.translate('xpack.onechat.editors.esqlEditor.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
