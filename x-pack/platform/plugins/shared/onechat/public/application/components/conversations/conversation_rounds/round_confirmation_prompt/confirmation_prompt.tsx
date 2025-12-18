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
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConfirmPromptDefinition } from '@kbn/onechat-common/agents';

const defaultLabels = {
  title: i18n.translate('xpack.onechat.confirmationPrompt.defaultTitle', {
    defaultMessage: 'Confirmation required',
  }),
  message: i18n.translate('xpack.onechat.confirmationPrompt.defaultMessage', {
    defaultMessage: 'Do you want to proceed with this action?',
  }),
  confirmText: i18n.translate('xpack.onechat.confirmationPrompt.confirm', {
    defaultMessage: 'Confirm',
  }),
  cancelText: i18n.translate('xpack.onechat.confirmationPrompt.cancel', {
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

  const panelStyles = css`
    border: 1px solid #d4af37;
    background-color: #fdf8e8;
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.base};
    color: ${euiTheme.colors.textParagraph};
  `;

  return (
    <EuiPanel
      css={panelStyles}
      paddingSize="m"
      hasShadow={false}
      data-test-subj="agentBuilderConfirmationPrompt"
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <span css={titleStyles}>{title}</span>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p style={{ margin: 0 }}>{message}</p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onCancel}
                disabled={isLoading}
                size="s"
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
                css={css`
                  background-color: #d4af37;
                  border-color: #d4af37;
                  &:hover:not(:disabled) {
                    background-color: #c9a432;
                    border-color: #c9a432;
                  }
                `}
                data-test-subj="agentBuilderConfirmationPromptConfirmButton"
              >
                {confirmText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

