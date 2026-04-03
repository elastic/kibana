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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiText,
  useEuiTheme,
  useEuiShadow,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SelectionPromptDefinition } from '@kbn/agent-builder-common/agents';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const defaultLabels = {
  title: i18n.translate('xpack.agentBuilder.selectionPrompt.defaultTitle', {
    defaultMessage: 'Choose an option',
  }),
  cancelText: i18n.translate('xpack.agentBuilder.selectionPrompt.cancel', {
    defaultMessage: 'Cancel',
  }),
  selectText: i18n.translate('xpack.agentBuilder.selectionPrompt.select', {
    defaultMessage: 'Continue',
  }),
};

export interface SelectionPromptProps {
  prompt: SelectionPromptDefinition;
  onSelect: (optionId: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SelectionPrompt: React.FC<SelectionPromptProps> = ({
  prompt,
  onSelect,
  onCancel,
  isLoading = false,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { euiTheme } = useEuiTheme();

  const title = prompt.title ?? defaultLabels.title;
  const cancelText = prompt.cancel_text ?? defaultLabels.cancelText;

  const handleSubmit = () => {
    if (selectedId) {
      setSubmitted(true);
      onSelect(selectedId);
    }
  };

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${borderRadiusXlStyles}
    border: 1px solid ${euiTheme.colors.borderStrongWarning};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('s')};
  `;

  const headerStyles = css`
    padding-bottom: ${euiTheme.size.s};
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    margin-bottom: ${euiTheme.size.s};
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.base};
    color: ${euiTheme.colors.textParagraph};
  `;

  const iconContainerStyles = css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: ${euiTheme.colors.backgroundLightWarning};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `;

  const isDisabled = isLoading || submitted;

  if (submitted) {
    const selectedOption = prompt.options.find((o) => o.id === selectedId);
    return (
      <EuiFlexGroup
        direction="column"
        responsive={false}
        css={containerStyles}
        gutterSize="none"
        data-test-subj="agentBuilderSelectionPromptConnecting"
      >
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="m" responsive={false} css={headerStyles}>
          <EuiFlexItem grow={false}>
            <div css={iconContainerStyles}>
              <EuiIcon type="link" color="warning" size="m" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <span css={titleStyles}>{title}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {selectedOption?.label ?? 'Processing...'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    );
  }

  const radioOptions = prompt.options.map((opt) => ({
    id: opt.id,
    label: (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {opt.icon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={opt.icon} size="m" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <strong>{opt.label}</strong>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {opt.description && (
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {opt.description}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  }));

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={containerStyles}
      gutterSize="none"
      data-test-subj="agentBuilderSelectionPrompt"
    >
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="m" responsive={false} css={headerStyles}>
        <EuiFlexItem grow={false}>
          <div css={iconContainerStyles}>
            <EuiIcon type="link" color="warning" size="m" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <span css={titleStyles}>{title}</span>
        </EuiFlexItem>
      </EuiFlexGroup>

      {prompt.message && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p style={{ margin: 0, marginBottom: euiTheme.size.s }}>{prompt.message}</p>
          </EuiText>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiRadioGroup
          options={radioOptions}
          idSelected={selectedId ?? ''}
          onChange={(id) => setSelectedId(id)}
          disabled={isDisabled}
          data-test-subj="agentBuilderSelectionPromptOptions"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false} style={{ marginTop: euiTheme.size.s }}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              disabled={isDisabled}
              size="s"
              color="text"
              data-test-subj="agentBuilderSelectionPromptCancelButton"
            >
              {cancelText}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSubmit}
              isLoading={isDisabled}
              disabled={!selectedId}
              fill
              size="s"
              color="warning"
              data-test-subj="agentBuilderSelectionPromptSelectButton"
            >
              {defaultLabels.selectText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
