/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProviderEnum } from '@kbn/elastic-assistant-common';
import { getSelectedConversations } from './utils';
import { PromptTypeEnum } from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
describe('getSelectedConversations', () => {
  const conversationSettings = {
    '8f1e3218-0b02-480a-8791-78c1ed5f3708': {
      timestamp: '2024-06-25T12:33:26.779Z',
      createdAt: '2024-06-25T12:33:26.779Z' as unknown as Date,
      users: [
        {
          id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          name: 'elastic',
        },
      ],
      title: 'New chat',
      category: 'assistant',
      apiConfig: {
        connectorId: 'acdeb074-f863-4e04-a22b-014391dd1be4',
        actionTypeId: '.gen-ai',
        provider: ProviderEnum.OpenAI,
        defaultSystemPromptId: 'mock-system-prompt-1',
        model: 'gpt-4',
      },
      messages: [],
      updatedAt: '2024-06-25T18:35:28.217Z' as unknown as Date,
      namespace: 'default',
      id: '8f1e3218-0b02-480a-8791-78c1ed5f3708',
      replacements: {},
      systemPrompt: {
        id: 'mock-system-prompt-1',
        content:
          'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nProvide the most detailed and relevant answer possible, as if you were relaying this information back to a cyber security expert.\nIf you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query. xxx',
        name: 'Enhanced system prompt',
        promptType: PromptTypeEnum.system,
        isDefault: true,
        isNewConversationDefault: true,
      },
    },
  };
  test('should return selected conversations', () => {
    const systemPromptId = 'mock-system-prompt-1';

    const conversations = getSelectedConversations(conversationSettings, systemPromptId);

    expect(conversations).toEqual(Object.values(conversationSettings));
  });
  test('should return empty array if no conversations are selected', () => {
    const systemPromptId = 'ooo';

    const conversations = getSelectedConversations(conversationSettings, systemPromptId);

    expect(conversations).toEqual([]);
  });
});
