/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, keys, useEuiTheme } from '@elastic/eui';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { i18n } from '@kbn/i18n';
import { AgentDisplay } from './agent_display';
import { ConversationContent } from './conversation_grid';
import { useConversation } from '../../hooks/use_conversation';
import { AgentSelectDropdown } from './agent_select_dropdown';
import { useChat } from '../../hooks/use_chat';

interface ConversationInputFormProps {
  onSubmit: () => void;
}

const fullHeightStyles = css`
  height: 100%;
`;

export const ConversationInputForm: React.FC<ConversationInputFormProps> = ({ onSubmit }) => {
  const [message, setMessage] = useState<string>('');
  const { euiTheme } = useEuiTheme();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const {
    actions: { setAgentId },
    conversation,
    hasActiveConversation,
  } = useConversation();
  const agentId = conversation?.agentId ?? oneChatDefaultAgentId;

  const { status, sendMessage } = useChat();
  const disabled = !message.trim() || status === 'loading';

  useEffect(() => {
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 200);
  }, []);

  const handleSubmit = useCallback(() => {
    if (disabled) {
      return;
    }

    sendMessage(message);
    onSubmit();
    setMessage('');
  }, [message, onSubmit, sendMessage, disabled]);

  const contentStyles = css`
    ${fullHeightStyles}
    align-items: stretch;
  `;
  const formContainerStyles = css`
    ${fullHeightStyles}
    padding: ${euiTheme.size.base};
    box-shadow: none;
    border: ${euiTheme.border.thin};
    border-color: ${euiTheme.border.color};
    border-radius: ${euiTheme.border.radius.medium};
    &:focus-within {
      border-bottom-color: ${euiTheme.colors.primary};
    }
  `;
  const inputContainerStyles = css`
    display: flex;
    flex-direction: column;
  `;
  const textareaStyles = css`
    flex-grow: 1;
    border: none;
    box-shadow: none;
    padding: 0;
    resize: none;
    &:focus:focus-visible {
      outline: none;
    }
  `;
  const labels = {
    container: i18n.translate('xpack.onechat.conversationInputForm.container', {
      defaultMessage: 'Message input form',
    }),
    submit: i18n.translate('xpack.onechat.conversationInputForm.submit', {
      defaultMessage: 'Submit',
    }),
    placeholder: i18n.translate('xpack.onechat.conversationInputForm.placeholder', {
      defaultMessage: 'Ask anything',
    }),
  };

  return (
    <ConversationContent css={contentStyles}>
      <EuiFlexGroup
        css={formContainerStyles}
        direction="column"
        gutterSize="s"
        responsive={false}
        alignItems="stretch"
        justifyContent="center"
        aria-label={labels.container}
      >
        <EuiFlexItem css={inputContainerStyles}>
          <textarea
            css={textareaStyles}
            data-test-subj="onechatAppConversationInputFormTextArea"
            value={message}
            onChange={(event) => {
              setMessage(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (!event.shiftKey && event.key === keys.ENTER) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={labels.placeholder}
            ref={textAreaRef}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            alignItems="center"
            justifyContent="flexEnd"
          >
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
                aria-label={labels.submit}
                data-test-subj="onechatAppConversationInputFormSubmitButton"
                iconType="kqlFunction"
                display="fill"
                size="m"
                disabled={disabled}
                onClick={handleSubmit}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ConversationContent>
  );
};
