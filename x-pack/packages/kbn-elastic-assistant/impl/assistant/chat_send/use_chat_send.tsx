/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessages } from '../use_send_messages';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import { Conversation, Message, Prompt } from '../../..';
import { getMessageFromRawResponse } from '../helpers';
import { getDefaultSystemPrompt } from '../use_conversation/helpers';

export interface UseChatSendProps {
  allSystemPrompts: Prompt[];
  currentConversation: Conversation;
  editingSystemPromptId: string | undefined;
  http: HttpSetup;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setEditingSystemPromptId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setPromptTextPreview: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  refresh: () => Promise<void>;
}

export interface UseChatSend {
  handleButtonSendMessage: (m: string) => void;
  handleOnChatCleared: () => void;
  handlePromptChange: (prompt: string) => void;
  handleSendMessage: (promptText: string) => void;
  handleRegenerateResponse: () => void;
  isLoading: boolean;
}

/**
 *  handles sending messages to an API and updating the conversation state.
 *  Provides a set of functions that can be used to handle user input, send messages to an API,
 *  and update the conversation state based on the API response.
 */
export const useChatSend = ({
  allSystemPrompts,
  currentConversation,
  editingSystemPromptId,
  http,
  selectedPromptContexts,
  setEditingSystemPromptId,
  setPromptTextPreview,
  setSelectedPromptContexts,
  setUserPrompt,
  refresh,
}: UseChatSendProps): UseChatSend => {
  const { isLoading, sendMessages } = useSendMessages();
  const { appendMessage, appendReplacements, clearConversation, removeLastMessage } =
    useConversation();

  const handlePromptChange = (prompt: string) => {
    setPromptTextPreview(prompt);
    setUserPrompt(prompt);
  };

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText: string) => {
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

      const updatedMessages = await appendMessage({
        conversationId: currentConversation.id,
        message,
      });

      // Reset prompt context selection and preview before sending:
      setSelectedPromptContexts({});
      setPromptTextPreview('');

      const rawResponse = await sendMessages({
        apiConfig: currentConversation.apiConfig,
        http,
        messages: updatedMessages ?? [],
        onNewReplacements,
        replacements: currentConversation.replacements ?? {},
      });

      const responseMessage: Message = getMessageFromRawResponse(rawResponse);
      await appendMessage({ conversationId: currentConversation.id, message: responseMessage });
      await refresh();
    },
    [
      allSystemPrompts,
      appendMessage,
      appendReplacements,
      currentConversation.apiConfig,
      currentConversation.id,
      currentConversation.messages.length,
      currentConversation.replacements,
      editingSystemPromptId,
      http,
      refresh,
      selectedPromptContexts,
      sendMessages,
      setPromptTextPreview,
      setSelectedPromptContexts,
    ]
  );

  const handleRegenerateResponse = useCallback(async () => {
    const onNewReplacements = (newReplacements: Record<string, string>) =>
      appendReplacements({
        conversationId: currentConversation.id,
        replacements: newReplacements,
      });

    const updatedMessages = await removeLastMessage(currentConversation.id);

    const rawResponse = await sendMessages({
      apiConfig: currentConversation.apiConfig,
      http,
      messages: updatedMessages ?? [],
      onNewReplacements,
      replacements: currentConversation.replacements ?? {},
    });
    const responseMessage: Message = getMessageFromRawResponse(rawResponse);
    await appendMessage({ conversationId: currentConversation.id, message: responseMessage });
    await refresh();
  }, [
    appendMessage,
    appendReplacements,
    currentConversation.apiConfig,
    currentConversation.id,
    currentConversation.replacements,
    http,
    refresh,
    removeLastMessage,
    sendMessages,
  ]);

  const handleButtonSendMessage = useCallback(
    (message: string) => {
      handleSendMessage(message);
      setUserPrompt('');
    },
    [handleSendMessage, setUserPrompt]
  );

  const handleOnChatCleared = useCallback(async () => {
    const defaultSystemPromptId = getDefaultSystemPrompt({
      allSystemPrompts,
      conversation: currentConversation,
    })?.id;

    setPromptTextPreview('');
    setUserPrompt('');
    setSelectedPromptContexts({});
    await clearConversation(currentConversation.id);
    setEditingSystemPromptId(defaultSystemPromptId);
    await refresh();
  }, [
    allSystemPrompts,
    clearConversation,
    currentConversation,
    refresh,
    setEditingSystemPromptId,
    setPromptTextPreview,
    setSelectedPromptContexts,
    setUserPrompt,
  ]);

  return {
    handleButtonSendMessage,
    handleOnChatCleared,
    handlePromptChange,
    handleSendMessage,
    handleRegenerateResponse,
    isLoading,
  };
};
