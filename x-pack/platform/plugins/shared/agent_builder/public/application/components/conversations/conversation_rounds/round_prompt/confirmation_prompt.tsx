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
  EuiMarkdownFormat,
  useEuiTheme,
  useEuiShadow,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConfirmPromptDefinition, ConfirmPromptColor } from '@kbn/agent-builder-common/agents';
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

const getBorderColor = (euiTheme: EuiThemeComputed, color: ConfirmPromptColor): string => {
  const borderColors: Record<ConfirmPromptColor, string> = {
    primary: euiTheme.colors.borderStrongPrimary,
    warning: euiTheme.colors.borderStrongWarning,
    danger: euiTheme.colors.borderStrongDanger,
  };
  return borderColors[color];
};

export interface ConfirmationPromptProps {
  prompt: ConfirmPromptDefinition;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isAnswered?: boolean;
  answeredValue?: boolean;
}

export const ConfirmationPrompt: React.FC<ConfirmationPromptProps> = ({
  prompt,
  onConfirm,
  onCancel,
  isLoading = false,
  isAnswered = false,
  answeredValue,
}) => {
  const { euiTheme } = useEuiTheme();
  const color = prompt.color ?? 'warning';
  const borderColor = getBorderColor(euiTheme, color);

  const title = prompt.title ?? defaultLabels.title;
  const confirmText = prompt.confirm_text ?? defaultLabels.confirmText;
  const cancelText = prompt.cancel_text ?? defaultLabels.cancelText;

  const body = prompt.message ?? defaultLabels.message;

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${borderRadiusXlStyles}
    border: 1px solid ${borderColor};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('s')};
  `;

  const headerStyles = css`
    padding-bottom: ${euiTheme.size.m};
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    margin-bottom: ${euiTheme.size.m};
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.base};
    color: ${euiTheme.colors.textParagraph};
  `;

  const footerStyles = css`
    margin-top: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={containerStyles}
      gutterSize="none"
      data-test-subj="agentBuilderConfirmationPrompt"
    >
      {/* Header */}
      <EuiFlexItem grow={false} css={headerStyles}>
        <span css={titleStyles}>{title}</span>
      </EuiFlexItem>

      {/* Body */}
      <EuiFlexItem grow={false}>
        <EuiMarkdownFormat textSize="s">{body}</EuiMarkdownFormat>
      </EuiFlexItem>

      {/* Action buttons */}
      <EuiFlexItem grow={false} css={footerStyles}>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              disabled={isLoading || isAnswered}
              size="s"
              color={isAnswered && answeredValue === false ? 'danger' : 'text'}
              data-test-subj="agentBuilderConfirmationPromptCancelButton"
            >
              {cancelText}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={isAnswered}
              fill={!isAnswered || answeredValue === true}
              size="s"
              color={isAnswered && answeredValue === true ? 'success' : color}
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
