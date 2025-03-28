/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecalledSuggestion, recallAndScore } from './recall_and_score';
import { scoreSuggestions } from './score_suggestions';
import { MessageRole, type Message } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
import { AnalyticsServiceStart } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { recallRankingEventType } from '../../analytics/recall_ranking';

jest.mock('./score_suggestions', () => ({
  scoreSuggestions: jest.fn(),
}));

export const sampleMessages: Message[] = [
  {
    '@timestamp': '2025-03-13T14:53:11.240Z',
    message: { role: MessageRole.User, content: 'test' },
  },
];

export const normalConversationMessages: Message[] = [
  {
    '@timestamp': '2025-03-12T21:00:13.980Z',
    message: { role: MessageRole.User, content: 'What is my favourite color?' },
  },
  {
    '@timestamp': '2025-03-12T21:00:14.920Z',
    message: {
      function_call: { name: 'context', trigger: MessageRole.Assistant },
      role: MessageRole.Assistant,
      content: '',
    },
  },
];

export const contextualInsightsMessages: Message[] = [
  {
    '@timestamp': '2025-03-12T21:01:21.111Z',
    message: {
      role: MessageRole.User,
      content: "I'm looking at an alert and trying to understand why it was triggered",
    },
  },
  {
    '@timestamp': '2025-03-12T21:01:21.111Z',
    message: {
      role: MessageRole.Assistant,
      function_call: {
        name: 'get_contextual_insight_instructions',
        trigger: MessageRole.Assistant,
        arguments: '{}',
      },
    },
  },
  {
    '@timestamp': '2025-03-12T21:01:21.111Z',
    message: {
      role: MessageRole.User,
      content:
        '{"instructions":"I\'m an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered......}',
      name: 'get_contextual_insight_instructions',
    },
  },
  {
    '@timestamp': '2025-03-12T21:01:21.984Z',
    message: {
      function_call: { name: 'context', trigger: MessageRole.Assistant },
      role: MessageRole.Assistant,
      content: '',
    },
  },
];

describe('recallAndScore', () => {
  const mockRecall = jest.fn();
  const mockChat = jest.fn() as unknown as FunctionCallChatFunction;
  const mockLogger = { error: jest.fn(), debug: jest.fn() } as unknown as Logger;
  const mockAnalytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceStart;
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no documents are recalled', () => {
    let result: {
      relevantDocuments?: RecalledSuggestion[];
      scores?: Array<{ id: string; score: number }>;
      suggestions: RecalledSuggestion[];
    };

    beforeEach(async () => {
      mockRecall.mockResolvedValue([]);

      result = await recallAndScore({
        recall: mockRecall,
        chat: mockChat,
        analytics: mockAnalytics,
        userPrompt: 'What is my favorite color?',
        context: 'Some context',
        messages: sampleMessages,
        logger: mockLogger,
        signal,
      });
    });

    it('returns empty suggestions', async () => {
      expect(result).toEqual({ relevantDocuments: [], scores: [], suggestions: [] });
    });

    it('invokes recall with user prompt and screen context', async () => {
      expect(mockRecall).toHaveBeenCalledWith({
        queries: [
          { text: 'What is my favorite color?', boost: 3 },
          { text: 'Some context', boost: 1 },
        ],
      });
    });

    it('does not score the suggestions', async () => {
      expect(scoreSuggestions).not.toHaveBeenCalled();
    });
  });

  it('handles errors when scoring fails', async () => {
    mockRecall.mockResolvedValue([{ id: 'doc1', text: 'Hello world', score: 0.5 }]);
    (scoreSuggestions as jest.Mock).mockRejectedValue(new Error('Scoring failed'));

    const result = await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      userPrompt: 'test',
      context: 'context',
      messages: sampleMessages,
      logger: mockLogger,
      signal,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error scoring documents: Scoring failed'),
      expect.any(Object)
    );
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].id).toBe('doc1');
  });

  it('calls scoreSuggestions with correct arguments', async () => {
    const recalledDocs = [{ id: 'doc1', text: 'Hello world', score: 0.8 }];
    mockRecall.mockResolvedValue(recalledDocs);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      scores: [{ id: 'doc1', score: 7 }],
      relevantDocuments: recalledDocs,
    });

    await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      userPrompt: 'test',
      context: 'context',
      messages: sampleMessages,
      logger: mockLogger,
      signal,
    });

    expect(scoreSuggestions).toHaveBeenCalledWith({
      suggestions: recalledDocs,
      logger: mockLogger,
      messages: sampleMessages,
      userPrompt: 'test',
      userMessageFunctionName: undefined,
      context: 'context',
      signal,
      chat: mockChat,
    });
  });

  it('handles the normal conversation flow correctly', async () => {
    mockRecall.mockResolvedValue([
      { id: 'fav_color', text: 'My favourite color is blue.', score: 0.9 },
    ]);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      scores: [{ id: 'fav_color', score: 7 }],
      relevantDocuments: [{ id: 'fav_color', text: 'My favourite color is blue.' }],
    });

    const result = await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      userPrompt: "What's my favourite color?",
      context: '',
      messages: normalConversationMessages,
      logger: mockLogger,
      signal,
    });

    expect(result.relevantDocuments).toEqual([
      { id: 'fav_color', text: 'My favourite color is blue.' },
    ]);
    expect(mockRecall).toHaveBeenCalled();
    expect(scoreSuggestions).toHaveBeenCalled();
  });

  it('handles contextual insights conversation flow correctly', async () => {
    mockRecall.mockResolvedValue([
      { id: 'alert_cause', text: 'The alert was triggered due to high CPU usage.', score: 0.85 },
    ]);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      scores: [{ id: 'alert_cause', score: 6 }],
      relevantDocuments: [
        { id: 'alert_cause', text: 'The alert was triggered due to high CPU usage.' },
      ],
    });

    const result = await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      userPrompt: "I'm looking at an alert and trying to understand why it was triggered",
      context: 'User is analyzing an alert',
      messages: contextualInsightsMessages,
      logger: mockLogger,
      signal,
    });

    expect(result.relevantDocuments).toEqual([
      { id: 'alert_cause', text: 'The alert was triggered due to high CPU usage.' },
    ]);
    expect(mockRecall).toHaveBeenCalled();
    expect(scoreSuggestions).toHaveBeenCalled();
  });

  it('reports analytics with the correct structure', async () => {
    const recalledDocs = [{ id: 'doc1', text: 'Hello world', score: 0.8 }];
    mockRecall.mockResolvedValue(recalledDocs);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      scores: [{ id: 'doc1', score: 7 }],
      relevantDocuments: recalledDocs,
    });

    await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      userPrompt: 'test',
      context: 'context',
      messages: sampleMessages,
      logger: mockLogger,
      signal,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      recallRankingEventType,
      expect.objectContaining({ scoredDocuments: [{ elserScore: 0.8, llmScore: 7 }] })
    );
  });
});
