/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { ConversationInputTextArea } from './conversation_input_text_area';
import { useAgentId } from '../../../hooks/use_conversation';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { ConversationInputActions } from './conversation_input_actions';

interface ConversationInputFormProps {
  onSubmit?: () => void;
}

const fullHeightStyles = css`
  height: 100%;
`;

export const ConversationInputForm: React.FC<ConversationInputFormProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const [input, setInput] = useState('');
  const { sendMessage, pendingMessage } = useSendMessage();
  const { euiTheme } = useEuiTheme();
  const { isFetched } = useOnechatAgents();
  const agentId = useAgentId();

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const shouldDisableTextArea = !isAgentIdValid && isFetched && !!agentId;
  const isSubmitDisabled = !input.trim() || isSendingMessage || !isAgentIdValid;

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    sendMessage({ message: input });
    setInput('');
    onSubmit?.();
  };

  const formContainerStyles = css`
    ${fullHeightStyles}
    padding: ${euiTheme.size.base};
    box-shadow: none;
    border: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    &:focus-within {
      border-bottom-color: ${euiTheme.colors.primary};
    }
  `;

  const formContainerDisabledStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseDisabled};
  `;

  return (
    <EuiFlexGroup
      css={[formContainerStyles, shouldDisableTextArea && formContainerDisabledStyles]}
      direction="column"
      gutterSize="s"
      responsive={false}
      alignItems="stretch"
      justifyContent="center"
      aria-label={i18n.translate('xpack.onechat.conversationInputForm', {
        defaultMessage: 'Message input form',
      })}
      aria-disabled={shouldDisableTextArea}
    >
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
    </EuiFlexGroup>
  );
};
