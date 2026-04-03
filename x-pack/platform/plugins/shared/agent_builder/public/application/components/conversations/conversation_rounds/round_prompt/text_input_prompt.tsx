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
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  useEuiShadow,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TextInputPromptDefinition } from '@kbn/agent-builder-common/agents';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const defaultLabels = {
  title: i18n.translate('xpack.agentBuilder.textInputPrompt.defaultTitle', {
    defaultMessage: 'Input required',
  }),
  message: i18n.translate('xpack.agentBuilder.textInputPrompt.defaultMessage', {
    defaultMessage: 'Please provide the requested value.',
  }),
  placeholder: i18n.translate('xpack.agentBuilder.textInputPrompt.defaultPlaceholder', {
    defaultMessage: 'Enter value...',
  }),
  submitText: i18n.translate('xpack.agentBuilder.textInputPrompt.submit', {
    defaultMessage: 'Submit',
  }),
  cancelText: i18n.translate('xpack.agentBuilder.textInputPrompt.cancel', {
    defaultMessage: 'Cancel',
  }),
};

export interface TextInputPromptProps {
  prompt: TextInputPromptDefinition;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const TextInputPrompt: React.FC<TextInputPromptProps> = ({
  prompt,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { euiTheme } = useEuiTheme();

  const handleSubmit = () => {
    if (value.trim()) {
      setSubmitted(true);
      onSubmit(value.trim());
    }
  };

  const title = prompt.title ?? defaultLabels.title;
  const message = prompt.message ?? defaultLabels.message;
  const placeholder = prompt.placeholder ?? defaultLabels.placeholder;
  const submitText = prompt.submit_text ?? defaultLabels.submitText;
  const cancelText = prompt.cancel_text ?? defaultLabels.cancelText;

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

  const InputComponent = prompt.is_secret ? EuiFieldPassword : EuiFieldText;
  const isDisabled = isLoading || submitted;

  if (submitted) {
    return (
      <EuiFlexGroup
        direction="column"
        responsive={false}
        css={containerStyles}
        gutterSize="none"
        alignItems="center"
        data-test-subj="agentBuilderTextInputPromptConnecting"
      >
        <EuiFlexGroup
          direction="row"
          alignItems="center"
          gutterSize="m"
          responsive={false}
          css={headerStyles}
        >
          <EuiFlexItem grow={false}>
            <div css={iconContainerStyles}>
              <EuiIcon type="key" color="warning" size="m" />
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
                Connecting and verifying credentials...
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={containerStyles}
      gutterSize="none"
      data-test-subj="agentBuilderTextInputPrompt"
    >
      <EuiFlexGroup
        direction="row"
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={headerStyles}
      >
        <EuiFlexItem grow={false}>
          <div css={iconContainerStyles}>
            <EuiIcon type="key" color="warning" size="m" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <span css={titleStyles}>{title}</span>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0, marginBottom: euiTheme.size.s }}>{message}</p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <InputComponent
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          fullWidth
          disabled={isDisabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              handleSubmit();
            }
          }}
          data-test-subj="agentBuilderTextInputPromptInput"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          justifyContent="flexEnd"
          responsive={false}
          style={{ marginTop: euiTheme.size.s }}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              disabled={isDisabled}
              size="s"
              color="text"
              data-test-subj="agentBuilderTextInputPromptCancelButton"
            >
              {cancelText}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSubmit}
              isLoading={isDisabled}
              disabled={!value.trim()}
              fill
              size="s"
              color="warning"
              data-test-subj="agentBuilderTextInputPromptSubmitButton"
            >
              {submitText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
