/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { ChatSend, Props } from '.';
import { HttpSetup } from '@kbn/core-http-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { useSendMessages } from '../use_send_messages';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { useConversation } from '../use_conversation';

jest.mock('../use_send_messages');
jest.mock('../use_conversation');

const setEditingSystemPromptId = jest.fn();
const setPromptTextPreview = jest.fn();
const setSelectedPromptContexts = jest.fn();
const setUserPrompt = jest.fn();
const sendMessages = jest.fn();
const appendMessage = jest.fn();
const appendReplacements = jest.fn();
const clearConversation = jest.fn();
const testProps: Props = {
  selectedPromptContexts: {},
  allSystemPrompts: [
    {
      id: 'default-system-prompt',
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:',
      name: 'Default system prompt',
      promptType: 'system',
      isDefault: true,
      isNewConversationDefault: true,
    },
    {
      id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nProvide the most detailed and relevant answer possible, as if you were relaying this information back to a cyber security expert.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:',
      name: 'Enhanced system prompt',
      promptType: 'system',
      isDefault: true,
    },
  ],
  isDisabled: false,
  shouldRefocusPrompt: false,
  userPrompt: '',
  currentConversation: {
    id: 'Welcome',
    isDefault: true,
    theme: {
      title: 'Elastic AI Assistant',
      titleIcon: 'logoSecurity',
      assistant: {
        name: 'Elastic AI Assistant',
        icon: 'logoSecurity',
      },
      system: {
        icon: 'logoElastic',
      },
      user: {},
    },
    messages: [
      {
        content:
          'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\n\n\nhow do i write host.name: * in EQL?',
        role: 'user',
        timestamp: '7/17/2023, 1:00:36 PM',
      },
      {
        role: 'assistant',
        content:
          "In EQL (Event Query Language), you can write the equivalent of `host.name: *` using the `exists` operator. Here's how you can write it:\n\n```\nexists(host.name)\n```\n\nThis query will match all events where the `host.name` field exists, effectively giving you the same result as `host.name: *`.",
        timestamp: '7/17/2023, 1:00:40 PM',
      },
      {
        content:
          '\n\nWhich Fleet enabled Elastic Agent integration should I use to collect logs and events from:',
        role: 'user',
        timestamp: '7/17/2023, 1:01:04 PM',
      },
      {
        role: 'assistant',
        content:
          'To collect logs and events from a host using Elastic Agent, you can use the "Logs" integration. The "Logs" integration is specifically designed to collect log files and events from various sources on a host.\n\nBy enabling the "Logs" integration, you can configure it to monitor specific log files or directories on the host and send the collected logs to Elasticsearch for further analysis and visualization in Elastic Security.\n\nPlease note that Elastic Agent supports multiple integrations, so depending on your specific use case, you may also consider other integrations such as "Auditd" for collecting Linux audit logs or "Winlog" for collecting Windows event logs.',
        timestamp: '7/17/2023, 1:01:10 PM',
      },
      {
        content: '\n\nwhat?',
        role: 'user',
        timestamp: '7/17/2023, 1:02:33 PM',
      },
      {
        role: 'assistant',
        content:
          'Apologies for the confusion. To collect logs and events from a host using Elastic Agent, you can use the "Endpoint Security" integration. The "Endpoint Security" integration is specifically designed to collect security-related logs and events from endpoints.\n\nBy enabling the "Endpoint Security" integration, you can configure it to collect logs such as process events, network events, file events, and more from the host. These logs are then sent to Elasticsearch for analysis and visualization in Elastic Security.\n\nPlease note that Elastic Agent supports multiple integrations, so depending on your specific use case, you may also consider other integrations such as "Auditd" for collecting Linux audit logs or "Winlog" for collecting Windows event logs.',
        timestamp: '7/17/2023, 1:02:39 PM',
      },
    ],
    apiConfig: {
      connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
      provider: OpenAiProviderType.OpenAi,
    },
  },
  http: {
    basePath: {
      basePath: '/mfg',
      serverBasePath: '/mfg',
    },
    anonymousPaths: {},
    externalUrl: {},
  } as unknown as HttpSetup,
  editingSystemPromptId: 'default-system-prompt',
  setEditingSystemPromptId,
  setPromptTextPreview,
  setSelectedPromptContexts,
  setUserPrompt,
};
const robotMessage = 'Response message from the robot';
describe('ChatSend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSendMessages as jest.Mock).mockReturnValue({
      isLoading: false,
      sendMessages: sendMessages.mockReturnValue(robotMessage),
    });
    (useConversation as jest.Mock).mockReturnValue({
      appendMessage,
      appendReplacements,
      clearConversation,
    });
  });
  it('a message is sent when a valid prompt text is provided', async () => {
    const { getByTestId, rerender } = render(<ChatSend {...testProps} />, {
      wrapper: TestProviders,
    });
    const promptTextArea = getByTestId('prompt-textarea');
    const promptText = 'valid prompt text';
    fireEvent.change(promptTextArea, { target: { value: promptText } });
    expect(setUserPrompt).toHaveBeenCalledWith(promptText);
    rerender(<ChatSend {...testProps} userPrompt={promptText} />);
    fireEvent.click(getByTestId('submit-chat'));
    await waitFor(() => {
      expect(sendMessages).toHaveBeenCalled();
      const appendMessageSend = appendMessage.mock.calls[0][0];
      const appendMessageResponse = appendMessage.mock.calls[1][0];
      expect(appendMessageSend.message.content).toEqual(`\n\n${promptText}`);
      expect(appendMessageSend.message.role).toEqual('user');
      expect(appendMessageResponse.message.content).toEqual(robotMessage);
      expect(appendMessageResponse.message.role).toEqual('assistant');
    });
  });

  it('the chat is cleared when the clear chat button is clicked', async () => {
    const { getByTestId } = render(<ChatSend {...testProps} />, {
      wrapper: TestProviders,
    });
    fireEvent.click(getByTestId('clear-chat'));
    expect(setPromptTextPreview).toHaveBeenCalledWith('');
    expect(setUserPrompt).toHaveBeenCalledWith('');
    expect(setSelectedPromptContexts).toHaveBeenCalledWith({});
    expect(clearConversation).toHaveBeenCalledWith(testProps.currentConversation.id);
    expect(setEditingSystemPromptId).toHaveBeenCalledWith('default-system-prompt');
  });
});
