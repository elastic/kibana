/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
  useEuiShadow,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConfirmPromptDefinition } from '@kbn/agent-builder-common/agents';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const defaultLabels = {
  title: i18n.translate('xpack.agentBuilder.confirmationPrompt.defaultTitle', {
    defaultMessage: 'Confirmation required',
  }),
  message: i18n.translate('xpack.agentBuilder.confirmationPrompt.defaultMessage', {
    defaultMessage: 'Do you want to proceed with this action?',
  }),
  confirmText: i18n.translate('xpack.agentBuilder.confirmationPrompt.confirm', {
    defaultMessage: 'Confirm',
  }),
  cancelText: i18n.translate('xpack.agentBuilder.confirmationPrompt.cancel', {
    defaultMessage: 'Cancel',
  }),
};

export interface ConfirmationPromptProps {
  prompt: ConfirmPromptDefinition;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationPrompt: React.FC<ConfirmationPromptProps> = ({
  prompt,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const title = prompt.title ?? defaultLabels.title;
  const message = prompt.message ?? defaultLabels.message;
  const confirmText = prompt.confirm_text ?? defaultLabels.confirmText;
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

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={containerStyles}
      gutterSize="none"
      data-test-subj="agentBuilderConfirmationPrompt"
    >
      {/* Header with icon and title */}
      <EuiFlexGroup
        direction="row"
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={headerStyles}
      >
        <EuiFlexItem grow={false}>
          <div css={iconContainerStyles}>
            <EuiIcon type="help" color="warning" size="m" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <span css={titleStyles}>{title}</span>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Message */}
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0, marginBottom: euiTheme.size.m }}>{message}</p>
        </EuiText>
      </EuiFlexItem>

      {/* Action buttons */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              disabled={isLoading}
              size="s"
              color="text"
              data-test-subj="agentBuilderConfirmationPromptCancelButton"
            >
              {cancelText}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onConfirm}
              isLoading={isLoading}
              fill
              size="s"
              color="warning"
              data-test-subj="agentBuilderConfirmationPromptConfirmButton"
            >
              {confirmText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
