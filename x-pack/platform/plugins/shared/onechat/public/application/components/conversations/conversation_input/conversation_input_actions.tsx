/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';
import { useAgentId, useHasActiveConversation } from '../../../hooks/use_conversation';
import { useConversationActions } from '../../../hooks/use_conversation_actions';
import { AgentDisplay } from '../agent_display';
import { AgentSelectDropdown } from '../agent_select_dropdown';
import { useSendMessage } from '../../../context/send_message_context';
interface ConversationInputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
}

const labels = {
  cancel: i18n.translate('xpack.onechat.conversationInputForm.cancel', {
    defaultMessage: 'Cancel',
  }),
  submit: i18n.translate('xpack.onechat.conversationInputForm.submit', {
    defaultMessage: 'Submit',
  }),
};

export const ConversationInputActions: React.FC<ConversationInputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  resetToPendingMessage,
}) => {
  const { setAgentId } = useConversationActions();
  const agentId = useAgentId();
  const hasActiveConversation = useHasActiveConversation();
  const { canCancel, cancel } = useSendMessage();
  const { euiTheme } = useEuiTheme();
  const cancelButtonStyles = css`
    background-color: ${euiTheme.colors.backgroundLightText};
  `;
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {hasActiveConversation ? (
            <AgentDisplay selectedAgentId={agentId} />
          ) : (
            <AgentSelectDropdown
              selectedAgentId={agentId}
              onAgentChange={(newAgentId: string) => {
                setAgentId(newAgentId);
              }}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canCancel ? (
            <EuiButtonIcon
              aria-label={labels.cancel}
              data-test-subj="onechatAppConversationInputFormCancelButton"
              iconType="stopFilled"
              size="m"
              color="text"
              css={cancelButtonStyles}
              onClick={() => {
                if (canCancel) {
                  cancel();
                  resetToPendingMessage();
                }
              }}
            />
          ) : (
            <EuiButtonIcon
              aria-label={labels.submit}
              data-test-subj="onechatAppConversationInputFormSubmitButton"
              iconType="sortUp"
              display="fill"
              size="m"
              disabled={isSubmitDisabled}
              onClick={onSubmit}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
