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
import { useSendMessage } from '../../../context/send_message_context';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { hasWorkflowCommands, transformWorkflowCommands } from '../../../utils/workflow_commands';
import { ConversationContent } from '../conversation_grid';
import { ConversationInputActions } from './conversation_input_actions';
import { ConversationInputTextArea } from './conversation_input_text_area';

interface ConversationInputFormProps {
  onSubmit: () => void;
}

const fullHeightStyles = css`
  height: 100%;
`;

export const ConversationInputForm: React.FC<ConversationInputFormProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const [input, setInput] = useState('');
  const { sendMessage, pendingMessage } = useSendMessage();
  const { euiTheme } = useEuiTheme();
  const isSubmitDisabled = !input.trim() || isSendingMessage;

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    
    // Transform workflow commands into natural language instructions
    const transformedMessage = hasWorkflowCommands(input) 
      ? transformWorkflowCommands(input)
      : input;
    
    sendMessage({ message: transformedMessage });
    setInput('');
    onSubmit();
  };

  const contentStyles = css`
    ${fullHeightStyles}
    align-items: stretch;
  `;
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

  return (
    <ConversationContent css={contentStyles}>
      <EuiFlexGroup
        css={formContainerStyles}
        direction="column"
        gutterSize="s"
        responsive={false}
        alignItems="stretch"
        justifyContent="center"
        aria-label={i18n.translate('xpack.onechat.conversationInputForm', {
          defaultMessage: 'Message input form',
        })}
      >
        <ConversationInputTextArea input={input} setInput={setInput} onSubmit={handleSubmit} />
        <ConversationInputActions
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          resetToPendingMessage={() => {
            if (pendingMessage) {
              setInput(pendingMessage);
            }
          }}
        />
      </EuiFlexGroup>
    </ConversationContent>
  );
};
