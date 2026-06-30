/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCodeBlock,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownFormat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TemplateFieldDefinition } from './template_conversation_utils';
import { getFieldBadgeColor } from './template_conversation_utils';
import { TemplateAssigneesField } from './template_assignees_field';

const labels = {
  notSet: i18n.translate('xpack.agentBuilder.conversationDetail.templateFieldRow.notSetLabel', {
    defaultMessage: 'Not set',
  }),
};

interface TemplateFieldRowProps {
  definition: TemplateFieldDefinition;
  value: unknown;
  isSaving: boolean;
  onChange: (key: string, value: unknown) => void;
}

const stringifyValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return labels.notSet;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const TemplateFieldRow: React.FC<TemplateFieldRowProps> = ({
  definition,
  value,
  isSaving,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const stringValue = value === undefined || value === null ? '' : String(value);
  const [draftValue, setDraftValue] = useState(stringValue);
  const renderType = definition.render ?? 'default';

  const readonlyValueStyles = css`
    width: 100%;
    min-height: ${euiTheme.size.xl};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.small};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    overflow-wrap: anywhere;
    word-break: break-word;

    .euiMarkdownFormat p:last-child {
      margin-bottom: 0;
    }
  `;

  const codeBlockStyles = css`
    max-width: 100%;

    .euiCodeBlock__pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  `;

  useEffect(() => {
    setDraftValue(stringValue);
  }, [stringValue]);

  const comboOptions = useMemo(
    () => (definition.options ?? []).map((option) => ({ label: option })),
    [definition.options]
  );

  const selectedOptions = useMemo(() => {
    if (!stringValue) {
      return [];
    }
    return [{ label: stringValue }];
  }, [stringValue]);

  const handleSelectChange = useCallback(
    (options: Array<{ label: string }>) => {
      onChange(definition.key, options[0]?.label ?? '');
    },
    [definition.key, onChange]
  );

  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftValue(event.target.value);
  }, []);

  const handleTextBlur = useCallback(() => {
    if (draftValue !== stringValue) {
      onChange(definition.key, draftValue);
    }
  }, [definition.key, draftValue, onChange, stringValue]);

  const handleAssigneesChange = useCallback(
    (assignees: Array<{ uid: string; username: string }>) => {
      onChange(definition.key, assignees);
    },
    [definition.key, onChange]
  );

  const badgePreview =
    stringValue && (renderType === 'badge' || renderType === 'severity_badge') ? (
      <EuiBadge color={getFieldBadgeColor(definition, stringValue)}>{stringValue}</EuiBadge>
    ) : null;

  if (definition.type === 'assignees') {
    return (
      <TemplateAssigneesField
        label={definition.label}
        value={value}
        isSaving={isSaving}
        onChange={handleAssigneesChange}
      />
    );
  }

  if (definition.type === 'select') {
    return (
      <EuiFormRow label={definition.label} fullWidth>
        <EuiComboBox
          singleSelection={{ asPlainText: true }}
          options={comboOptions}
          selectedOptions={selectedOptions}
          onChange={handleSelectChange}
          isDisabled={isSaving}
          compressed
          aria-label={definition.label}
        />
      </EuiFormRow>
    );
  }

  if (definition.type === 'markdown') {
    return (
      <EuiFormRow label={definition.label} fullWidth>
        <div css={readonlyValueStyles}>
          <EuiMarkdownFormat textSize="s">{stringifyValue(value)}</EuiMarkdownFormat>
        </div>
      </EuiFormRow>
    );
  }

  if (definition.type === 'readonly_text') {
    return (
      <EuiFormRow label={definition.label} fullWidth>
        <div css={readonlyValueStyles}>
          <EuiText size="s">{stringifyValue(value)}</EuiText>
        </div>
      </EuiFormRow>
    );
  }

  if (definition.type === 'json') {
    return (
      <EuiFormRow label={definition.label} fullWidth>
        <EuiCodeBlock
          language="json"
          paddingSize="s"
          fontSize="s"
          transparentBackground
          css={[readonlyValueStyles, codeBlockStyles]}
        >
          {stringifyValue(value)}
        </EuiCodeBlock>
      </EuiFormRow>
    );
  }

  if (renderType === 'badge' && stringValue) {
    return (
      <EuiFormRow label={definition.label} fullWidth>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{badgePreview}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFieldText
              value={draftValue}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              disabled={isSaving}
              compressed
              aria-label={definition.label}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }

  return (
    <EuiFormRow label={definition.label} fullWidth>
      <EuiFieldText
        value={draftValue}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        disabled={isSaving}
        compressed
        aria-label={definition.label}
      />
    </EuiFormRow>
  );
};
