/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useSendMessage } from '../use_send_message';
import { useConversation } from '../use_conversation';
import { emptyWelcomeConvo, welcomeConvo } from '../../mock/conversation';
import { defaultSystemPrompt, mockSystemPrompt } from '../../mock/system_prompt';
import { useChatSend, UseChatSendProps } from './use_chat_send';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { useAssistantContext } from '../../..';

jest.mock('../use_send_message');
jest.mock('../use_conversation');
jest.mock('../../..');

const setEditingSystemPromptId = jest.fn();
const setPromptTextPreview = jest.fn();
const setSelectedPromptContexts = jest.fn();
const setUserPrompt = jest.fn();
const sendMessage = jest.fn();
const removeLastMessage = jest.fn();
const clearConversation = jest.fn();
const refresh = jest.fn();
const setCurrentConversation = jest.fn();

export const testProps: UseChatSendProps = {
  selectedPromptContexts: {},
  allSystemPrompts: [defaultSystemPrompt, mockSystemPrompt],
  currentConversation: { ...emptyWelcomeConvo, id: 'an-id' },
  http: {
    basePath: {
      basePath: '/mfg',
      serverBasePath: '/mfg',
    },
    anonymousPaths: {},
    externalUrl: {},
  } as unknown as HttpSetup,
  editingSystemPromptId: defaultSystemPrompt.id,
  setEditingSystemPromptId,
  setPromptTextPreview,
  setSelectedPromptContexts,
  setUserPrompt,
  refresh,
  setCurrentConversation,
};
const robotMessage = { response: 'Response message from the robot', isError: false };
const reportAssistantMessageSent = jest.fn();
describe('use chat send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSendMessage as jest.Mock).mockReturnValue({
      isLoading: false,
      sendMessage: sendMessage.mockReturnValue(robotMessage),
    });
    (useConversation as jest.Mock).mockReturnValue({
      removeLastMessage,
      clearConversation,
    });
    (useAssistantContext as jest.Mock).mockReturnValue({
      assistantTelemetry: {
        reportAssistantMessageSent,
      },
      knowledgeBase: { isEnabledKnowledgeBase: false, isEnabledRAGAlerts: false },
    });
  });
  it('handleOnChatCleared clears the conversation', async () => {
    const { result } = renderHook(() => useChatSend(testProps), {
      wrapper: TestProviders,
    });
    result.current.handleOnChatCleared();
    expect(clearConversation).toHaveBeenCalled();
    expect(setPromptTextPreview).toHaveBeenCalledWith('');
    expect(setUserPrompt).toHaveBeenCalledWith('');
    expect(setSelectedPromptContexts).toHaveBeenCalledWith({});
    await waitFor(() => {
      expect(clearConversation).toHaveBeenCalledWith(testProps.currentConversation.id);
      expect(refresh).toHaveBeenCalled();
    });
    expect(setEditingSystemPromptId).toHaveBeenCalledWith(defaultSystemPrompt.id);
  });
  it('handlePromptChange updates prompt successfully', () => {
    const { result } = renderHook(() => useChatSend(testProps), {
      wrapper: TestProviders,
    });
    result.current.handlePromptChange('new prompt');
    expect(setPromptTextPreview).toHaveBeenCalledWith('new prompt');
    expect(setUserPrompt).toHaveBeenCalledWith('new prompt');
  });
  it('handleButtonSendMessage sends message with context prompt when a valid prompt text is provided', async () => {
    const promptText = 'prompt text';
    const { result } = renderHook(() => useChatSend(testProps), {
      wrapper: TestProviders,
    });
    result.current.handleButtonSendMessage(promptText);
    expect(setUserPrompt).toHaveBeenCalledWith('');

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
      const appendMessageSend = sendMessage.mock.calls[0][0].message;
      expect(appendMessageSend).toEqual(
        `You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\n\n\n${promptText}`
      );
    });
  });
  it('handleButtonSendMessage sends message with only provided prompt text and context already exists in convo history', async () => {
    const promptText = 'prompt text';
    const { result } = renderHook(
      () =>
        useChatSend({ ...testProps, currentConversation: { ...welcomeConvo, id: 'welcome-id' } }),
      {
        wrapper: TestProviders,
      }
    );

    result.current.handleButtonSendMessage(promptText);
    expect(setUserPrompt).toHaveBeenCalledWith('');

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
      const messages = setCurrentConversation.mock.calls[0][0].messages;
      expect(messages[messages.length - 1].content).toEqual(`\n\n${promptText}`);
    });
  });
  it('handleRegenerateResponse removes the last message of the conversation, resends the convo to GenAI, and appends the message received', async () => {
    const { result } = renderHook(
      () =>
        useChatSend({ ...testProps, currentConversation: { ...welcomeConvo, id: 'welcome-id' } }),
      {
        wrapper: TestProviders,
      }
    );

    result.current.handleRegenerateResponse();
    expect(removeLastMessage).toHaveBeenCalledWith('welcome-id');

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
      const messages = setCurrentConversation.mock.calls[1][0].messages;
      expect(messages[messages.length - 1].content).toEqual(robotMessage.response);
    });
  });
  it('sends telemetry events for both user and assistant', async () => {
    const promptText = 'prompt text';
    const { result } = renderHook(() => useChatSend(testProps), {
      wrapper: TestProviders,
    });
    result.current.handleButtonSendMessage(promptText);
    expect(setUserPrompt).toHaveBeenCalledWith('');

    await waitFor(() => {
      expect(reportAssistantMessageSent).toHaveBeenNthCalledWith(1, {
        conversationId: testProps.currentConversation.title,
        role: 'user',
        isEnabledKnowledgeBase: false,
        isEnabledRAGAlerts: false,
      });
      expect(reportAssistantMessageSent).toHaveBeenNthCalledWith(2, {
        conversationId: testProps.currentConversation.title,
        role: 'assistant',
        isEnabledKnowledgeBase: false,
        isEnabledRAGAlerts: false,
      });
    });
  });
});
