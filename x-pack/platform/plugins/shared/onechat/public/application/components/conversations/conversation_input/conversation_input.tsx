/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useState } from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { ConversationInputTextArea } from './conversation_input_text_area';
import { useAgentId } from '../../../hooks/use_conversation';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { ConversationInputActions } from './conversation_input_actions';

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
    box-shadow: none;
    border: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    flex-grow: 0;
    &:focus-within {
      border-bottom-color: ${euiTheme.colors.primary};
    }
  `;
  const inputContainerDisabledStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseDisabled};
  `;

  return (
    <EuiFlexGroup
      css={[inputContainerStyles, isDisabled && inputContainerDisabledStyles]}
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

export const ConversationInput: React.FC<ConversationInputProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const [input, setInput] = useState('');
  const hasInput = Boolean(input.trim());
  const { sendMessage, pendingMessage } = useSendMessage();
  const { isFetched } = useOnechatAgents();
  const agentId = useAgentId();

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const shouldDisableTextArea = !isAgentIdValid && isFetched && !!agentId;
  const isSubmitDisabled = !hasInput || isSendingMessage || !isAgentIdValid;

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    sendMessage({ message: input });
    setInput('');
    onSubmit?.();
  };

  return (
    <InputContainer isDisabled={shouldDisableTextArea}>
      <ConversationInputTextArea
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        disabled={shouldDisableTextArea}
        agentId={agentId}
      />
      {!shouldDisableTextArea && (
        <ConversationInputActions
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          resetToPendingMessage={() => {
            if (pendingMessage) {
              setInput(pendingMessage);
            }
          }}
          agentId={agentId}
        />
      )}
    </InputContainer>
  );
};
