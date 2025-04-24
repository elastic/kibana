/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scoreSuggestions } from './score_suggestions';
import { Logger } from '@kbn/logging';
import { of } from 'rxjs';
import { MessageRole, StreamingChatResponseEventType } from '../../../common';
import { RecalledSuggestion } from './recall_and_score';
import { FunctionCallChatFunction } from '../../service/types';
import { ChatEvent } from '../../../common/conversation_complete';
import { contextualInsightsMessages, normalConversationMessages } from './recall_and_score.test';

const suggestions: RecalledSuggestion[] = [
  { id: 'doc1', text: 'Relevant document 1', esScore: 0.9 },
  { id: 'doc2', text: 'Relevant document 2', esScore: 0.8 },
  { id: 'doc3', text: 'Less relevant document 3', esScore: 0.3 },
];

const userPrompt = 'What is my favourite color?';
const context = 'Some context';

describe('scoreSuggestions', () => {
  const mockLogger = { error: jest.fn(), debug: jest.fn() } as unknown as Logger;
  let mockChat: jest.MockedFunction<FunctionCallChatFunction>;

  beforeEach(() => {
    mockChat = jest.fn((_name, _params) =>
      of({
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        message: {
          function_call: {
            name: 'score',
            arguments: JSON.stringify({ scores: 'doc1,7\ndoc2,5\ndoc3,3' }),
          },
        },
      } as ChatEvent)
    );
  });

  it('should correctly score and return relevant documents', async () => {
    const result = await scoreSuggestions({
      suggestions,
      messages: normalConversationMessages,
      userPrompt,
      context,
      chat: mockChat,
      signal: new AbortController().signal,
      logger: mockLogger,
    });

    expect(result.llmScores).toEqual([
      { id: 'doc1', llmScore: 7 },
      { id: 'doc2', llmScore: 5 },
      { id: 'doc3', llmScore: 3 },
    ]);

    expect(result.relevantDocuments).toEqual([
      { id: 'doc1', text: 'Relevant document 1', esScore: 0.9 },
      { id: 'doc2', text: 'Relevant document 2', esScore: 0.8 },
    ]);
  });

  it('should return no relevant documents if all scores are low', async () => {
    mockChat.mockReturnValueOnce(
      of({
        id: 'mock-id',
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        message: {
          function_call: {
            name: 'score',
            arguments: JSON.stringify({ scores: 'doc1,2\ndoc2,3\ndoc3,1' }),
          },
        },
      })
    );

    const result = await scoreSuggestions({
      suggestions,
      messages: normalConversationMessages,
      userPrompt,
      userMessageFunctionName: 'score',
      context,
      chat: mockChat,
      signal: new AbortController().signal,
      logger: mockLogger,
    });

    expect(result.relevantDocuments).toEqual([]);
  });

  it('should ignore hallucinated document IDs', async () => {
    mockChat.mockReturnValueOnce(
      of({
        id: 'mock-id',
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        message: {
          function_call: {
            name: 'score',
            arguments: JSON.stringify({ scores: 'doc1,6\nfake_doc,5' }),
          },
        },
      })
    );

    const result = await scoreSuggestions({
      suggestions,
      messages: normalConversationMessages,
      userPrompt,
      context,
      chat: mockChat,
      signal: new AbortController().signal,
      logger: mockLogger,
    });

    expect(result.relevantDocuments).toEqual([
      { id: 'doc1', text: 'Relevant document 1', esScore: 0.9 },
    ]);
  });

  it('it throws an exception when function args are invalid', async () => {
    mockChat.mockReturnValueOnce(
      of({
        id: 'mock-id',
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        message: { function_call: { name: 'score', arguments: 'invalid_json' } },
      })
    );

    await expect(
      scoreSuggestions({
        suggestions,
        messages: normalConversationMessages,
        userPrompt,
        context,
        chat: mockChat,
        signal: new AbortController().signal,
        logger: mockLogger,
      })
    ).rejects.toThrow();
  });

  it('should handle scenarios where the last user message is a tool response', async () => {
    const lastUserMessage = contextualInsightsMessages
      .filter((message) => message.message.role === MessageRole.User)
      .pop();

    const result = await scoreSuggestions({
      suggestions,
      messages: contextualInsightsMessages,
      userPrompt: lastUserMessage?.message.content!,
      userMessageFunctionName: lastUserMessage?.message.name,
      context,
      chat: mockChat,
      signal: new AbortController().signal,
      logger: mockLogger,
    });

    expect(result.llmScores).toEqual([
      { id: 'doc1', llmScore: 7 },
      { id: 'doc2', llmScore: 5 },
      { id: 'doc3', llmScore: 3 },
    ]);
  });
});
