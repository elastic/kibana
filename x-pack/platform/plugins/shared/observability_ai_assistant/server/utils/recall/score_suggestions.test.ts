/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundInferenceClient } from '@kbn/inference-plugin/server';
import { Logger } from '@kbn/logging';
import { MessageRole } from '../../../common';
import { KnowledgeBaseHit } from '../../service/knowledge_base_service/types';
import { scoreSuggestions } from './score_suggestions';
import { createMockInternalKbDoc } from './create_mock_internal_kb_doc';
import { recallMockData } from './mock_data';

const { contextualInsightsMessages, normalConversationMessages } = recallMockData;

const entries: KnowledgeBaseHit[] = [
  createMockInternalKbDoc({
    id: 'doc1',
    score: 0.9,
    text: 'Relevant document 1',
  }),
  createMockInternalKbDoc({
    id: 'doc2',
    score: 0.8,
    text: 'Relevant document 2',
  }),
  createMockInternalKbDoc({
    id: 'doc3',
    score: 0.3,
    text: 'Relevant document 3',
  }),
];

const userPrompt = 'What is my favourite color?';
const context = 'Some context';

describe('scoreSuggestions', () => {
  const mockLogger = { error: jest.fn(), debug: jest.fn() } as unknown as Logger;

  const mockInferenceClient: jest.Mocked<BoundInferenceClient> = {
    output: jest.fn(),
    chatComplete: jest.fn(),
    getConnectorById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockInferenceClient.output.mockResolvedValue({
      id: '',
      content: '',
      output: {
        scores: 'doc1,7\ndoc2,5\ndoc3,3',
      },
    });
  });

  it('should correctly score and return relevant documents', async () => {
    const result = await scoreSuggestions({
      entries,
      messages: normalConversationMessages,
      userPrompt,
      context,
      signal: new AbortController().signal,
      logger: mockLogger,
      inferenceClient: mockInferenceClient,
    });

    expect(Object.fromEntries(result.scores?.entries()!)).toEqual({
      doc1: 7,
      doc2: 5,
      doc3: 3,
    });

    expect(result.selected).toEqual(['doc1', 'doc2']);
  });

  it('should return no relevant documents if all scores are low', async () => {
    mockInferenceClient.output.mockResolvedValue({
      id: '',
      content: '',
      output: {
        scores: 'doc1,2\ndoc2,3\ndoc3,1',
      },
    });

    const result = await scoreSuggestions({
      entries: [],
      messages: normalConversationMessages,
      userPrompt,
      context,
      signal: new AbortController().signal,
      logger: mockLogger,
      inferenceClient: mockInferenceClient,
    });

    expect(result.selected).toEqual([]);
  });

  it('should ignore hallucinated document IDs', async () => {
    mockInferenceClient.output.mockResolvedValue({
      id: '',
      content: '',
      output: {
        scores: 'doc1,6\nfake_doc,5',
      },
    });

    const result = await scoreSuggestions({
      entries,
      messages: normalConversationMessages,
      userPrompt,
      context,
      signal: new AbortController().signal,
      logger: mockLogger,
      inferenceClient: mockInferenceClient,
    });

    expect(result.selected).toEqual(['doc1']);
  });

  it('should handle scenarios where the last user message is a tool response', async () => {
    const lastUserMessage = contextualInsightsMessages
      .filter((message) => message.message.role === MessageRole.User)
      .pop();

    const result = await scoreSuggestions({
      entries,
      messages: contextualInsightsMessages,
      userPrompt: lastUserMessage?.message.content!,
      context,
      inferenceClient: mockInferenceClient,
      signal: new AbortController().signal,
      logger: mockLogger,
    });

    expect(Object.fromEntries(result.scores?.entries()!)).toEqual({
      doc1: 7,
      doc2: 5,
      doc3: 3,
    });
  });
});
