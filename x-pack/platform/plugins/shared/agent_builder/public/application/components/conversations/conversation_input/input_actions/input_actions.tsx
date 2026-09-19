/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConversationActionButton } from './conversation_action_button';
import { ConnectorSelector } from './connector_selector';
import { ChatTriggerMode } from '../../../../../../common/http_api/chat';

const connectorFlexItemStyles = css`
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
`;

const runAgentLabel = i18n.translate('xpack.agentBuilder.conversationInput.runAgentSwitch.label', {
  defaultMessage: 'Run agent',
});

interface InputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  resetToPendingMessage: () => void;
  showTriggerModeToggle: boolean;
  triggerMode: ChatTriggerMode;
  onTriggerModeChange: (mode: ChatTriggerMode) => void;
}

export const InputActions: React.FC<InputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  resetToPendingMessage,
  showTriggerModeToggle,
  triggerMode,
  onTriggerModeChange,
}) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      alignItems="center"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false} css={connectorFlexItemStyles}>
        <ConnectorSelector />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          {showTriggerModeToggle && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={runAgentLabel}
                checked={triggerMode === ChatTriggerMode.Always}
                onChange={(event) =>
                  onTriggerModeChange(
                    event.target.checked ? ChatTriggerMode.Always : ChatTriggerMode.Never
                  )
                }
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ConversationActionButton
              onSubmit={onSubmit}
              isSubmitDisabled={isSubmitDisabled}
              isSubmitting={isSubmitting}
              resetToPendingMessage={resetToPendingMessage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
