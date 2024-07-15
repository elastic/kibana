/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';

import {
  analyzeMarkdown,
  getConversationApiConfig,
  getDefaultNewSystemPrompt,
  getDefaultSystemPrompt,
} from './helpers';
import { AIConnector } from '../../connectorland/connector_selector';
import { Conversation } from '../../..';
import { PromptResponse } from '@kbn/elastic-assistant-common';

const tilde = '`';
const codeDelimiter = '```';

const markDownWithDSLQuery = `
Certainly! Here's an example of a Query DSL (Domain-Specific Language) query using the Elasticsearch Query DSL syntax:

${codeDelimiter}
POST /<index>/_search
{
  \"query\": {
    \"bool\": {
      \"must\": [
        {
          \"match\": {
            \"event.category\": \"security\"
          }
        },
        {
          \"match\": {
            \"message\": \"keyword\"
          }
        }
      ]
    }
  }
}
${codeDelimiter}

In this example, you need to replace ${tilde}<index>${tilde} with the actual name of the index where your security-related data is stored.

The query is structured using the JSON format. It uses the ${tilde}bool${tilde} query to combine multiple conditions using the ${tilde}must${tilde} clause. In this case, we are using the ${tilde}match${tilde} query to search for documents where the ${tilde}event.category${tilde} field matches \"security\" and the ${tilde}message${tilde} field matches \"keyword\". You can modify these values to match your specific search criteria.

By sending this query to the appropriate endpoint, you can retrieve search results that match the specified conditions. The response will include the relevant documents that meet the search criteria.

Remember to refer to the Elastic documentation for more information on the available DQL syntax and query options to further customize and refine your searches based on your specific needs.
`;

const markDownWithKQLQuery = `Certainly! Here's a KQL query based on the ${tilde}user.name${tilde} field:

${codeDelimiter}
user.name: \"9dcc9960-78cf-4ef6-9a2e-dbd5816daa60\"
${codeDelimiter}

This query will filter the events based on the condition that the ${tilde}user.name${tilde} field should exactly match the value \"9dcc9960-78cf-4ef6-9a2e-dbd5816daa60\".`;

describe('useConversation helpers', () => {
  const allSystemPrompts: PromptResponse[] = [
    {
      id: '1',
      content: 'Prompt 1',
      name: 'Prompt 1',
      promptType: 'quick',
    },
    {
      id: '2',
      content: 'Prompt 2',
      name: 'Prompt 2',
      promptType: 'quick',
      isNewConversationDefault: true,
    },
    {
      id: '3',
      content: 'Prompt 3',
      name: 'Prompt 3',
      promptType: 'quick',
    },
  ];
  const allSystemPromptsNoDefault: PromptResponse[] = allSystemPrompts.filter(
    ({ isNewConversationDefault }) => isNewConversationDefault !== true
  );

  describe('analyzeMarkdown', () => {
    it('should identify dsl Query successfully.', () => {
      const result = analyzeMarkdown(markDownWithDSLQuery);
      expect(result[0].type).toBe('dsl');
    });
    it('should identify kql Query successfully.', () => {
      const result = analyzeMarkdown(markDownWithKQLQuery);
      expect(result[0].type).toBe('kql');
    });
  });

  describe('getDefaultNewSystemPrompt', () => {
    test('should return the default (starred) isNewConversationDefault system prompt', () => {
      const result = getDefaultNewSystemPrompt(allSystemPrompts);

      expect(result).toEqual(allSystemPrompts[1]);
    });

    test('should return the first prompt if default new system prompt do not exist', () => {
      const result = getDefaultNewSystemPrompt(allSystemPromptsNoDefault);

      expect(result).toEqual(allSystemPromptsNoDefault[0]);
    });

    test('should return undefined if default (starred) isNewConversationDefault system prompt does not exist and there are no system prompts', () => {
      const result = getDefaultNewSystemPrompt([]);

      expect(result).toEqual(undefined);
    });
  });

  describe('getDefaultSystemPrompt', () => {
    const conversation: Conversation = {
      apiConfig: {
        connectorId: '123',
        actionTypeId: '.gen-ai',
        defaultSystemPromptId: '3',
      },
      category: 'assistant',
      id: '1',
      messages: [],
      replacements: {},
      title: '1',
    };
    test('should return the conversation system prompt if it exists', () => {
      const result = getDefaultSystemPrompt({ allSystemPrompts, conversation });

      expect(result).toEqual(allSystemPrompts[2]);
    });

    test('should return the default (starred) isNewConversationDefault system prompt if conversation system prompt does not exist', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        ...conversation,
        apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(allSystemPrompts[1]);
    });

    test('should return the default (starred) isNewConversationDefault system prompt if conversation system prompt does not exist within all system prompts', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
        replacements: {},
        category: 'assistant',
        id: '4', // this id does not exist within allSystemPrompts
        messages: [],
        title: '4',
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(allSystemPrompts[1]);
    });

    test('should return the first prompt if both conversation system prompt and default new system prompt do not exist', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        ...conversation,
        apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts: allSystemPromptsNoDefault,
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(allSystemPromptsNoDefault[0]);
    });

    test('should return undefined if conversation system prompt does not exist and there are no system prompts', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        ...conversation,
        apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts: [],
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(undefined);
    });

    test('should return undefined if conversation system prompt does not exist within all system prompts', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        ...conversation,
        apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
        replacements: {},
        id: '4', // this id does not exist within allSystemPrompts
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts: allSystemPromptsNoDefault,
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(allSystemPromptsNoDefault[0]);
    });

    test('should return (starred) isNewConversationDefault system prompt if conversation is undefined', () => {
      const result = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: undefined,
      });

      expect(result).toEqual(allSystemPrompts[1]);
    });

    test('should return the first system prompt if the conversation is undefined and isNewConversationDefault is not present in system prompts', () => {
      const result = getDefaultSystemPrompt({
        allSystemPrompts: allSystemPromptsNoDefault,
        conversation: undefined,
      });

      expect(result).toEqual(allSystemPromptsNoDefault[0]);
    });

    test('should return undefined if conversation is undefined and no system prompts are provided', () => {
      const result = getDefaultSystemPrompt({
        allSystemPrompts: [],
        conversation: undefined,
      });

      expect(result).toEqual(undefined);
    });
  });
});

describe('getConversationApiConfig', () => {
  const allSystemPrompts: PromptResponse[] = [
    {
      id: '1',
      content: 'Prompt 1',
      name: 'Prompt 1',
      promptType: 'quick',
    },
    {
      id: '2',
      content: 'Prompt 2',
      name: 'Prompt 2',
      promptType: 'quick',
      isNewConversationDefault: true,
    },
    {
      id: '3',
      content: 'Prompt 3',
      name: 'Prompt 3',
      promptType: 'quick',
    },
  ];

  const conversation: Conversation = {
    apiConfig: {
      connectorId: '123',
      actionTypeId: '.gen-ai',
      defaultSystemPromptId: '2',
      model: 'gpt-3',
    },
    category: 'assistant',
    id: '1',
    messages: [],
    replacements: {},
    title: 'Test Conversation',
  };

  const connectors: AIConnector[] = [
    {
      id: '123',
      actionTypeId: '.gen-ai',
      apiProvider: OpenAiProviderType.OpenAi,
    },
    {
      id: '456',
      actionTypeId: '.gen-ai',
      apiProvider: OpenAiProviderType.AzureAi,
    },
  ] as AIConnector[];

  const defaultConnector: AIConnector = {
    id: '456',
    actionTypeId: '.gen-ai',
    apiProvider: OpenAiProviderType.AzureAi,
  } as AIConnector;

  test('should return the correct API config when connector and system prompt are found', () => {
    const result = getConversationApiConfig({
      allSystemPrompts,
      conversation,
      connectors,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '123',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.OpenAi,
        defaultSystemPromptId: '2',
        model: 'gpt-3',
      },
    });
  });

  test('should return the default connector when specific connector is not found', () => {
    const conversationWithMissingConnector: Conversation = {
      ...conversation,
      apiConfig: { ...conversation.apiConfig, connectorId: '999' } as Conversation['apiConfig'],
    };

    const result = getConversationApiConfig({
      allSystemPrompts,
      conversation: conversationWithMissingConnector,
      connectors,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '456',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.AzureAi,
        defaultSystemPromptId: '2',
        model: 'gpt-3',
      },
    });
  });

  test('should return an empty object when no connectors are provided and default connector is missing', () => {
    const result = getConversationApiConfig({
      allSystemPrompts,
      conversation,
    });

    expect(result).toEqual({});
  });

  test('should return the default system prompt if conversation system prompt is not found', () => {
    const conversationWithMissingSystemPrompt: Conversation = {
      ...conversation,
      apiConfig: {
        ...conversation.apiConfig,
        defaultSystemPromptId: '999',
      } as Conversation['apiConfig'],
    };

    const result = getConversationApiConfig({
      allSystemPrompts,
      conversation: conversationWithMissingSystemPrompt,
      connectors,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '123',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.OpenAi,
        defaultSystemPromptId: '2', // Returns the default system prompt for new conversations
        model: 'gpt-3',
      },
    });
  });

  test('should return the correct config when connectors are not provided', () => {
    const result = getConversationApiConfig({
      allSystemPrompts,
      conversation,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '456',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.AzureAi,
        defaultSystemPromptId: '2',
        model: 'gpt-3',
      },
    });
  });

  test('should return the first system prompt if both conversation system prompt and default new system prompt do not exist', () => {
    const allSystemPromptsNoDefault: PromptResponse[] = allSystemPrompts.filter(
      ({ isNewConversationDefault }) => isNewConversationDefault !== true
    );

    const conversationWithoutSystemPrompt: Conversation = {
      ...conversation,
      apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
    };

    const result = getConversationApiConfig({
      allSystemPrompts: allSystemPromptsNoDefault,
      conversation: conversationWithoutSystemPrompt,
      connectors,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '123',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.OpenAi,
        defaultSystemPromptId: '1', // Uses the first prompt in the list
        model: undefined, // default connector's model
      },
    });
  });

  test('should return the first system prompt if conversation system prompt does not exist within all system prompts', () => {
    const allSystemPromptsNoDefault: PromptResponse[] = allSystemPrompts.filter(
      ({ isNewConversationDefault }) => isNewConversationDefault !== true
    );

    const conversationWithoutSystemPrompt: Conversation = {
      ...conversation,
      apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
      id: '4', // this id does not exist within allSystemPrompts
    };

    const result = getConversationApiConfig({
      allSystemPrompts: allSystemPromptsNoDefault,
      conversation: conversationWithoutSystemPrompt,
      connectors,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '123',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.OpenAi,
        defaultSystemPromptId: '1', // Uses the first prompt in the list
        model: undefined, // default connector's model
      },
    });
  });

  test('should return the new default system prompt if defaultSystemPromptId is undefined', () => {
    const conversationWithUndefinedPrompt: Conversation = {
      ...conversation,
      apiConfig: {
        ...conversation.apiConfig,
        defaultSystemPromptId: undefined,
      } as Conversation['apiConfig'],
    };

    const result = getConversationApiConfig({
      allSystemPrompts,
      conversation: conversationWithUndefinedPrompt,
      connectors,
      defaultConnector,
    });

    expect(result).toEqual({
      apiConfig: {
        connectorId: '123',
        actionTypeId: '.gen-ai',
        provider: OpenAiProviderType.OpenAi,
        defaultSystemPromptId: '1',
        model: 'gpt-3',
      },
    });
  });
});
