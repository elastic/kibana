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
  EuiLink,
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
  openConversation: i18n.translate(
    'xpack.agentBuilder.conversationDetail.templateFieldRow.openConversationLabel',
    {
      defaultMessage: 'Open conversation',
    }
  ),
};

interface TemplateFieldRowProps {
  definition: TemplateFieldDefinition;
  value: unknown;
  isSaving: boolean;
  onChange: (key: string, value: unknown) => void;
  onOpenConversation?: (conversationId: string) => void;
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

const getConversationIds = (value: unknown): string[] => {
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  }

  return [];
};

export const TemplateFieldRow: React.FC<TemplateFieldRowProps> = ({
  definition,
  value,
  isSaving,
  onChange,
  onOpenConversation,
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

  const renderConversationLinks = () => {
    const conversationIds = getConversationIds(value);
    if (!conversationIds.length) {
      return <EuiText size="s">{labels.notSet}</EuiText>;
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
        {conversationIds.map((conversationId, index) => {
          const baseLabel = definition.linkLabel ?? labels.openConversation;
          const label = conversationIds.length > 1 ? `${baseLabel} ${index + 1}` : baseLabel;

          return (
            <EuiFlexItem key={conversationId} grow={false}>
              <EuiLink
                onClick={onOpenConversation ? () => onOpenConversation(conversationId) : undefined}
                data-test-subj={`conversationMetadataLink-${definition.key}-${index}`}
              >
                {label}
              </EuiLink>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  };

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

  if (definition.type === 'conversation_link' || definition.type === 'conversation_links') {
    return (
      <EuiFormRow label={definition.label} fullWidth>
        <div css={readonlyValueStyles}>{renderConversationLinks()}</div>
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
