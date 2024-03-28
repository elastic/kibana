/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeMarkdown, getDefaultSystemPrompt } from './helpers';
import { Conversation, Prompt } from '../../..';

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

  describe('getDefaultSystemPrompt', () => {
    const allSystemPrompts: Prompt[] = [
      {
        id: '1',
        content: 'Prompt 1',
        name: 'Prompt 1',
        promptType: 'user',
      },
      {
        id: '2',
        content: 'Prompt 2',
        name: 'Prompt 2',
        promptType: 'user',
        isNewConversationDefault: true,
      },
      {
        id: '3',
        content: 'Prompt 3',
        name: 'Prompt 3',
        promptType: 'user',
      },
    ];
    const allSystemPromptsNoDefault: Prompt[] = allSystemPrompts.filter(
      ({ isNewConversationDefault }) => isNewConversationDefault !== true
    );
    const conversation: Conversation = {
      apiConfig: {
        connectorId: '123',
        defaultSystemPromptId: '3',
      },
      category: 'assistant',
      id: '1',
      messages: [],
      replacements: [],
      title: '1',
    };

    test('should return the conversation system prompt if it exists', () => {
      const result = getDefaultSystemPrompt({ allSystemPrompts, conversation });

      expect(result).toEqual(allSystemPrompts[2]);
    });

    test('should return the default (starred) isNewConversationDefault system prompt if conversation system prompt does not exist', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        apiConfig: { connectorId: '123' },
        replacements: [],
        category: 'assistant',
        id: '1',
        messages: [],
        title: '1',
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(allSystemPrompts[1]);
    });

    test('should return the default (starred) isNewConversationDefault system prompt if conversation system prompt does not exist within all system prompts', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        apiConfig: { connectorId: '123' },
        replacements: [],
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
        apiConfig: { connectorId: '123' },
        replacements: [],
        category: 'assistant',
        id: '1',
        messages: [],
        title: '1',
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts: allSystemPromptsNoDefault,
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(allSystemPromptsNoDefault[0]);
    });

    test('should return undefined if conversation system prompt does not exist and there are no system prompts', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        apiConfig: { connectorId: '123' },
        replacements: [],
        category: 'assistant',
        id: '1',
        messages: [],
        title: '1',
      };
      const result = getDefaultSystemPrompt({
        allSystemPrompts: [],
        conversation: conversationWithoutSystemPrompt,
      });

      expect(result).toEqual(undefined);
    });

    test('should return undefined if conversation system prompt does not exist within all system prompts', () => {
      const conversationWithoutSystemPrompt: Conversation = {
        apiConfig: { connectorId: '123' },
        replacements: [],
        category: 'assistant',
        id: '4', // this id does not exist within allSystemPrompts
        messages: [],
        title: '1',
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
