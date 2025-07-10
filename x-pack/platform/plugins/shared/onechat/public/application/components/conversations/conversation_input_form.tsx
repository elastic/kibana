/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, KeyboardEvent, useEffect, useRef } from 'react';
import { css } from '@emotion/css';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  keys,
  useEuiTheme,
} from '@elastic/eui';
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

export const ConversationInputForm: React.FC<ConversationInputFormProps> = ({ onSubmit }) => {
  const [message, setMessage] = useState<string>('');
  const disabled = !message.trim();
  const { euiTheme } = useEuiTheme();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { actions, conversation, hasActiveConversation } = useConversation();
  const agentId = conversation?.agentId ?? oneChatDefaultAgentId;

  const { sendMessage } = useChat();

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

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.currentTarget.value);
  }, []);

  const handleTextAreaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!event.shiftKey && event.key === keys.ENTER) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const topContainerClass = css`
    padding-bottom: ${euiTheme.size.m};
  `;
  const textAreaClass = css`
    border: none;
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
    <ConversationContent>
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="stretch"
        justifyContent="center"
        className={topContainerClass}
        aria-label={labels.container}
      >
        <EuiFlexItem>
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            responsive={false}
            alignItems="stretch"
            justifyContent="center"
          >
            <EuiFlexItem>
              <EuiTextArea
                data-test-subj="onechatAppConversationInputFormTextArea"
                fullWidth
                rows={1}
                resize="vertical"
                value={message}
                onChange={handleChange}
                onKeyDown={handleTextAreaKeyDown}
                placeholder={labels.placeholder}
                inputRef={textAreaRef}
                className={textAreaClass}
              />
            </EuiFlexItem>

            <EuiFlexItem>
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
                        actions.setAgentId(newAgentId);
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </ConversationContent>
  );
};
