/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConversationActionButton } from './conversation_action_button';
import { ConnectorSelector } from './connector_selector';
import { TriggerModeSelector } from './trigger_mode_selector';
import { ChatTriggerMode } from '../../../../../../common/http_api/chat';

const mentionButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.inputActions.mentionButtonLabel',
  { defaultMessage: 'Mention a teammate or the agent' }
);

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
  /** Shows the mention button when set. */
  onMentionClick?: () => void;
}

export const InputActions: React.FC<InputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  showTriggerModeSelector,
  triggerMode,
  onTriggerModeChange,
  onMentionClick,
}) => {
  const showConnectorSelector = triggerMode !== ChatTriggerMode.Never;
  const showStartActions = showConnectorSelector || Boolean(onMentionClick);

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        justifyContent={showStartActions ? 'spaceBetween' : 'flexEnd'}
      >
        {showStartActions && (
          <EuiFlexItem grow={false} css={connectorFlexItemStyles}>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              {onMentionClick && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={mentionButtonLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="at"
                      color="text"
                      size="s"
                      aria-label={mentionButtonLabel}
                      data-test-subj="agentBuilderConversationInputMentionButton"
                      // Keeps the focus in the editor, so the menu opens under the caret
                      onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
                      onClick={onMentionClick}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {showConnectorSelector && (
                <EuiFlexItem grow={false} css={connectorFlexItemStyles}>
                  <ConnectorSelector />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
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
