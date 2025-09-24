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
import type { AgentDefinition } from '@kbn/onechat-common';
import { useConversationActions } from '../../../hooks/use_conversation_actions';
import { AgentDisplay } from '../agent_display';
import { AgentSelectDropdown } from '../agent_select_dropdown';
import { useSendMessage } from '../../../context/send_message/send_message_context';
interface ConversationInputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
  agents?: AgentDefinition[];
  currentAgent?: AgentDefinition | null;
  isLoading?: boolean;
  hasActiveConversation?: boolean;
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
  agents,
  currentAgent,
  isLoading,
  hasActiveConversation,
}) => {
  const { setAgentId } = useConversationActions();
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
            <AgentDisplay currentAgent={currentAgent} isLoading={isLoading} />
          ) : (
            <AgentSelectDropdown
              selectedAgentId={currentAgent?.id}
              onAgentChange={(newAgentId: string) => {
                setAgentId(newAgentId);
              }}
              agents={agents}
              isLoading={isLoading}
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
