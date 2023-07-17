/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { HttpSetup } from '@kbn/core-http-browser';
import { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessages } from '../use_send_messages';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import { Message, Conversation, Prompt } from '../../..';
import { getMessageFromRawResponse } from '../helpers';
import { getDefaultSystemPrompt } from '../use_conversation/helpers';
import { ChatActions } from '../chat_actions';
import { PromptTextArea } from '../prompt_textarea';

interface Props {
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  http: HttpSetup;
  editingSystemPromptId: string | undefined;
  setEditingSystemPromptId: React.Dispatch<React.SetStateAction<string | undefined>>;
  allSystemPrompts: Prompt[];
  isDisabled: boolean;
  currentConversation: Conversation;
  shouldRefocusPrompt: boolean;
  userPrompt: string | null;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  setPromptTextPreview: React.Dispatch<React.SetStateAction<string>>;
}

export const ChatSend: FunctionComponent<Props> = ({
  selectedPromptContexts,
  setSelectedPromptContexts,
  allSystemPrompts,
  isDisabled,
  shouldRefocusPrompt,
  setUserPrompt,
  userPrompt,
  setPromptTextPreview,
  currentConversation,
  http,
  editingSystemPromptId,
  setEditingSystemPromptId,
}) => {
  // For auto-focusing prompt within timeline
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const { isLoading, sendMessages } = useSendMessages();
  const { appendMessage, appendReplacements, clearConversation } = useConversation();

  useEffect(() => {
    if (shouldRefocusPrompt && promptTextAreaRef.current) {
      promptTextAreaRef?.current.focus();
    }
  }, [shouldRefocusPrompt]);
  const handlePromptChange = useCallback(
    (prompt: string) => {
      setPromptTextPreview(prompt);
      setUserPrompt(prompt);
    },
    [setPromptTextPreview, setUserPrompt]
  );

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText) => {
      const onNewReplacements = (newReplacements: Record<string, string>) =>
        appendReplacements({
          conversationId: currentConversation.id,
          replacements: newReplacements,
        });

      const systemPrompt = allSystemPrompts.find((prompt) => prompt.id === editingSystemPromptId);

      const message = await getCombinedMessage({
        isNewChat: currentConversation.messages.length === 0,
        currentReplacements: currentConversation.replacements,
        onNewReplacements,
        promptText,
        selectedPromptContexts,
        selectedSystemPrompt: systemPrompt,
      });

      const updatedMessages = appendMessage({
        conversationId: currentConversation.id,
        message,
      });

      // Reset prompt context selection and preview before sending:
      setSelectedPromptContexts({});
      setPromptTextPreview('');

      const rawResponse = await sendMessages({
        http,
        apiConfig: currentConversation.apiConfig,
        messages: updatedMessages,
      });
      const responseMessage: Message = getMessageFromRawResponse(rawResponse);
      appendMessage({ conversationId: currentConversation.id, message: responseMessage });
    },
    [
      allSystemPrompts,
      currentConversation,
      selectedPromptContexts,
      appendMessage,
      setSelectedPromptContexts,
      setPromptTextPreview,
      sendMessages,
      http,
      appendReplacements,
      editingSystemPromptId,
    ]
  );

  const handleButtonSendMessage = useCallback(() => {
    handleSendMessage(promptTextAreaRef.current?.value?.trim() ?? '');
    setUserPrompt('');
  }, [handleSendMessage, setUserPrompt]);

  const handleOnChatCleared = useCallback(() => {
    const defaultSystemPromptId = getDefaultSystemPrompt({
      allSystemPrompts,
      conversation: currentConversation,
    })?.id;

    setPromptTextPreview('');
    setUserPrompt('');
    setSelectedPromptContexts({});
    clearConversation(currentConversation.id);
    setEditingSystemPromptId(defaultSystemPromptId);
  }, [
    allSystemPrompts,
    clearConversation,
    currentConversation,
    setEditingSystemPromptId,
    setPromptTextPreview,
    setSelectedPromptContexts,
    setUserPrompt,
  ]);

  return (
    <EuiFlexGroup
      gutterSize="none"
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem>
        <PromptTextArea
          onPromptSubmit={handleSendMessage}
          ref={promptTextAreaRef}
          handlePromptChange={handlePromptChange}
          value={isDisabled ? '' : userPrompt ?? ''}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          left: -34px;
          position: relative;
          top: 11px;
        `}
        grow={false}
      >
        <ChatActions
          onChatCleared={handleOnChatCleared}
          isDisabled={isDisabled}
          isLoading={isLoading}
          onSendMessage={handleButtonSendMessage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
