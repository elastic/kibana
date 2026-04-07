/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ConversationActionButton } from './conversation_action_button';
import { ConnectorSelector } from './connector_selector';

interface InputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
  agentId?: string;
  onFork?: () => void;
  isForkLoading?: boolean;
}

const forkLabel = i18n.translate('xpack.agentBuilder.conversationInput.forkButton.label', {
  defaultMessage: 'Fork conversation',
});

export const InputActions: React.FC<InputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  resetToPendingMessage,
  agentId,
  onFork,
  isForkLoading,
}) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      alignItems="center"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <ConnectorSelector />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          {onFork && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={forkLabel}>
                {isForkLoading ? (
                  <EuiLoadingSpinner size="s" aria-label={forkLabel} />
                ) : (
                  <EuiButtonIcon
                    aria-label={forkLabel}
                    data-test-subj="agentBuilderConversationForkButton"
                    iconType="branch"
                    size="s"
                    color="text"
                    onClick={onFork}
                    disabled={isForkLoading}
                  />
                )}
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ConversationActionButton
              onSubmit={onSubmit}
              isSubmitDisabled={isSubmitDisabled}
              resetToPendingMessage={resetToPendingMessage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
