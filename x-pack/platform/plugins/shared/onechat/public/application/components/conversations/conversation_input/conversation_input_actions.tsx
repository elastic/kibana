/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { useConversation } from '../../../hooks/use_conversation';
import { AgentDisplay } from '../agent_display';
import { AgentSelectDropdown } from '../agent_select_dropdown';

interface ConversationInputActionsProps {
  handleSubmit: () => void;
  submitDisabled: boolean;
}

export const ConversationInputActions: React.FC<ConversationInputActionsProps> = ({
  handleSubmit,
  submitDisabled,
}) => {
  const {
    conversation,
    hasActiveConversation,
    actions: { setAgentId },
  } = useConversation();
  const agentId = conversation?.agent_id ?? oneChatDefaultAgentId;
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
          <EuiButtonIcon
            aria-label={i18n.translate('xpack.onechat.conversationInputForm.submit', {
              defaultMessage: 'Submit',
            })}
            data-test-subj="onechatAppConversationInputFormSubmitButton"
            iconType="sortUp"
            display="fill"
            size="m"
            disabled={submitDisabled}
            onClick={handleSubmit}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
