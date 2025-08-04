/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { ConversationContent } from '../conversation_grid';
import { ConversationInputActions } from './conversation_input_actions';
import { ConversationInputTextArea } from './conversation_input_text_area';

interface ConversationInputFormProps {
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
}

const fullHeightStyles = css`
  height: 100%;
`;

export const ConversationInputForm: React.FC<ConversationInputFormProps> = ({
  message,
  setMessage,
  onSubmit,
}) => {
  const isSendingMessage = useIsSendingMessage();
  const { euiTheme } = useEuiTheme();
  const disabled = !message.trim() || isSendingMessage;

  const handleSubmit = () => {
    if (disabled) {
      return;
    }
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
        <ConversationInputTextArea
          message={message}
          setMessage={setMessage}
          handleSubmit={handleSubmit}
        />
        <ConversationInputActions handleSubmit={handleSubmit} submitDisabled={disabled} />
      </EuiFlexGroup>
    </ConversationContent>
  );
};
