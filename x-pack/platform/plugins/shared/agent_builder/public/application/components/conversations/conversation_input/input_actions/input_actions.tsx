/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { ConversationActionButton } from './conversation_action_button';
import { ConnectorSelector } from './connector_selector';
import { TriggerModeSelector } from './trigger_mode_selector';
import { ChatTriggerMode } from '../../../../../../common/http_api/chat';

const connectorFlexItemStyles = css`
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
`;

interface InputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  showTriggerModeSelector: boolean;
  triggerMode: ChatTriggerMode;
  onTriggerModeChange: (mode: ChatTriggerMode) => void;
}

export const InputActions: React.FC<InputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  showTriggerModeSelector,
  triggerMode,
  onTriggerModeChange,
}) => {
  const showConnectorSelector = triggerMode !== ChatTriggerMode.Never;

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        justifyContent={showConnectorSelector ? 'spaceBetween' : 'flexEnd'}
      >
        {showConnectorSelector && (
          <EuiFlexItem grow={false} css={connectorFlexItemStyles}>
            <ConnectorSelector />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            {showTriggerModeSelector && (
              <EuiFlexItem grow={false}>
                <TriggerModeSelector
                  triggerMode={triggerMode}
                  onTriggerModeChange={onTriggerModeChange}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <ConversationActionButton
                onSubmit={onSubmit}
                isSubmitDisabled={isSubmitDisabled}
                isSubmitting={isSubmitting}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
