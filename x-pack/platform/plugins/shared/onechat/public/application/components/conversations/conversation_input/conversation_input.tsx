/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  useEuiShadow,
  useEuiShadowHover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { MessageEditor, useMessageEditor } from './message_editor';
import { useAgentId } from '../../../hooks/use_conversation';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { ConversationInputActions } from './conversation_input_actions';
import { useConversationId } from '../../../context/conversation/use_conversation_id';

const MIN_HEIGHT = 150;

const InputContainer: React.FC<PropsWithChildren<{ isDisabled: boolean }>> = ({
  children,
  isDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    min-height: ${MIN_HEIGHT}px;
    padding: ${euiTheme.size.base};
    transition: box-shadow 250ms, border-color 250ms;

    ${useEuiShadow('s')}
    border: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    border-radius: 6px;
    flex-grow: 0;
    &:focus-within[aria-disabled='false'] {
      ${useEuiShadow('xl')}
      border-color: ${euiTheme.colors.primary};
      :hover {
        ${useEuiShadowHover('xl')}
      }
    }
    &:hover {
      ${useEuiShadowHover('s')}
    }
    &[aria-disabled='true'] {
      background-color: ${euiTheme.colors.backgroundBaseDisabled};
    }
  `;

  return (
    <EuiFlexGroup
      css={inputContainerStyles}
      direction="column"
      gutterSize="s"
      responsive={false}
      alignItems="stretch"
      justifyContent="center"
      data-test-subj="agentBuilderConversationInputForm"
      aria-label={i18n.translate('xpack.onechat.conversationInput.container.label', {
        defaultMessage: 'Message input form',
      })}
      aria-disabled={isDisabled}
    >
      {children}
    </EuiFlexGroup>
  );
};

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

const inputContainerStyles = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const ConversationInput: React.FC<ConversationInputProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const { sendMessage, pendingMessage } = useSendMessage();
  const { isFetched } = useOnechatAgents();
  const agentId = useAgentId();
  const conversationId = useConversationId();
  const messageEditor = useMessageEditor();

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const isInputDisabled = !isAgentIdValid && isFetched && !!agentId;
  const isSubmitDisabled = messageEditor.isEmpty || isSendingMessage || !isAgentIdValid;

  const placeholder = isInputDisabled ? disabledPlaceholder(agentId) : enabledPlaceholder;

  // Auto-focus when conversation changes
  useEffect(() => {
    setTimeout(() => {
      messageEditor.focus();
    }, 200);
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
      <EuiFlexItem css={inputContainerStyles}>
        <MessageEditor
          messageEditor={messageEditor}
          onSubmit={handleSubmit}
          disabled={isInputDisabled}
          placeholder={placeholder}
          data-test-subj="agentBuilderConversationInputEditor"
        />
      </EuiFlexItem>
      {!isInputDisabled && (
        <ConversationInputActions
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
