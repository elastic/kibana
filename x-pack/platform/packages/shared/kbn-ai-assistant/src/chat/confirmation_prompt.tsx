/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ConfirmationPromptProps {
  message: string;
  type: 'destructive' | 'warning';
  confirmButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationPrompt({
  message,
  type,
  confirmButtonText,
  onConfirm,
  onCancel,
}: ConfirmationPromptProps) {
  const defaultConfirmText = i18n.translate('xpack.aiAssistant.confirmationPrompt.confirm', {
    defaultMessage: 'Confirm',
  });
  
  const cancelText = i18n.translate('xpack.aiAssistant.confirmationPrompt.cancel', {
    defaultMessage: 'Cancel',
  });

  return (
    <EuiPanel color={type === 'destructive' ? 'danger' : 'warning'} hasShadow={false} paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{message}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color={type === 'destructive' ? 'danger' : 'warning'}
                size="s"
                onClick={onConfirm}
              >
                {confirmButtonText || defaultConfirmText}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={onCancel}>
                {cancelText}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}


