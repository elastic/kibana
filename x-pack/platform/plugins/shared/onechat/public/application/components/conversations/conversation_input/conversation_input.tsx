/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { useAgentId } from '../../../hooks/use_conversation';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { InputActions } from './input_actions';
import { InputContainer } from './input_container';
import { MessageEditor, useMessageEditor } from './message_editor';

interface ConversationInputProps {
  onSubmit?: () => void;
}

const disabledPlaceholder = (agentId?: string) =>
  i18n.translate('xpack.onechat.conversationInput.textArea.disabledPlaceholder', {
    defaultMessage: 'Agent "{agentId}" has been deleted. Please start a new conversation.',
    values: {
      agentId,
    },
  });
const enabledPlaceholder = i18n.translate(
  'xpack.onechat.conversationInput.textArea.enabledPlaceholder',
  {
    defaultMessage: 'Ask anything',
  }
);

export const ConversationInput: React.FC<ConversationInputProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const { sendMessage, pendingMessage } = useSendMessage();
  const { isFetched } = useOnechatAgents();
  const agentId = useAgentId();
  const conversationId = useConversationId();
  const messageEditor = useMessageEditor();

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const isInputDisabled = !isAgentIdValid && isFetched && Boolean(agentId);
  const isSubmitDisabled = messageEditor.isEmpty || isSendingMessage || !isAgentIdValid;

  const placeholder = isInputDisabled ? disabledPlaceholder(agentId) : enabledPlaceholder;

  const { euiTheme } = useEuiTheme();
  const editorContainerStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    /* Aligns editor text with action menus' text */
    padding-left: ${euiTheme.size.m};
  `;

  // Auto-focus when conversation changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messageEditor.focus();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [conversationId, messageEditor]);

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    const content = messageEditor.getContent();
    sendMessage({ message: content });
    messageEditor.clear();
    onSubmit?.();
  };

  return (
    <InputContainer isDisabled={isInputDisabled}>
      <EuiFlexItem css={editorContainerStyles}>
        <MessageEditor
          messageEditor={messageEditor}
          onSubmit={handleSubmit}
          disabled={isInputDisabled}
          placeholder={placeholder}
          data-test-subj="agentBuilderConversationInputEditor"
        />
      </EuiFlexItem>
      {!isInputDisabled && (
        <InputActions
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          resetToPendingMessage={() => {
            if (pendingMessage) {
              messageEditor.setContent(pendingMessage);
            }
          }}
          agentId={agentId}
        />
      )}
    </InputContainer>
  );
};
