/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecalledSuggestion, recallAndScore } from './recall_and_score';
import { scoreSuggestions } from './score_suggestions';
import { MessageRole, type Message } from '../../../../common';
import type { FunctionCallChatFunction } from '../../../service/types';
import { AnalyticsServiceStart } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { recallRankingEventType } from '../../../analytics/recall_ranking';

jest.mock('./score_suggestions', () => ({
  scoreSuggestions: jest.fn(),
}));

export const normalConversationMessages: Message[] = [
  {
    '@timestamp': '2025-03-12T21:00:13.980Z',
    message: { role: MessageRole.User, content: 'What is my favourite color?' },
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
      llmScores?: Array<{ id: string; llmScore: number }>;
      suggestions: RecalledSuggestion[];
    };

    beforeEach(async () => {
      mockRecall.mockResolvedValue([]);

      result = await recallAndScore({
        recall: mockRecall,
        chat: mockChat,
        analytics: mockAnalytics,
        screenDescription: 'The user is looking at Discover',
        messages: normalConversationMessages,
        logger: mockLogger,
        signal,
      });
    });

    it('returns empty suggestions', async () => {
      expect(result).toEqual({ relevantDocuments: [], llmScores: [], suggestions: [] });
    });

    it('invokes recall with user prompt', async () => {
      expect(mockRecall).toHaveBeenCalledWith({
        queries: [{ text: 'What is my favourite color?', boost: 1 }],
      });
    });

    it('does not score the suggestions', async () => {
      expect(scoreSuggestions).not.toHaveBeenCalled();
    });
  });

  it('handles errors when scoring fails', async () => {
    mockRecall.mockResolvedValue([{ id: 'doc1', text: 'Hello world', esScore: 0.5 }]);
    (scoreSuggestions as jest.Mock).mockRejectedValue(new Error('Scoring failed'));

    const result = await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      screenDescription: 'The user is looking at Discover',
      messages: normalConversationMessages,
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
    const recalledDocs = [{ id: 'doc1', text: 'Hello world', esScore: 0.8 }];
    mockRecall.mockResolvedValue(recalledDocs);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      llmScores: [{ id: 'doc1', llmScore: 7 }],
      relevantDocuments: recalledDocs,
    });

    await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      screenDescription: 'The user is looking at Discover',
      messages: normalConversationMessages,
      logger: mockLogger,
      signal,
    });

    expect(scoreSuggestions).toHaveBeenCalledWith({
      suggestions: recalledDocs,
      logger: mockLogger,
      messages: normalConversationMessages,
      userMessageFunctionName: undefined,
      screenDescription: 'The user is looking at Discover',
      signal,
      chat: mockChat,
    });
  });

  it('handles the normal conversation flow correctly', async () => {
    mockRecall.mockResolvedValue([
      { id: 'fav_color', text: 'My favourite color is blue.', esScore: 0.9 },
    ]);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      llmScores: [{ id: 'fav_color', llmScore: 7 }],
      relevantDocuments: [{ id: 'fav_color', text: 'My favourite color is blue.' }],
    });

    const result = await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      screenDescription: '',
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
      { id: 'alert_cause', text: 'The alert was triggered due to high CPU usage.', esScore: 0.85 },
    ]);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      llmScores: [{ id: 'alert_cause', llmScore: 6 }],
      relevantDocuments: [
        { id: 'alert_cause', text: 'The alert was triggered due to high CPU usage.' },
      ],
    });

    const result = await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      screenDescription: 'User is analyzing an alert',
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
    const recalledDocs = [{ id: 'doc1', text: 'Hello world', esScore: 0.8 }];
    mockRecall.mockResolvedValue(recalledDocs);
    (scoreSuggestions as jest.Mock).mockResolvedValue({
      llmScores: [{ id: 'doc1', llmScore: 7 }],
      relevantDocuments: recalledDocs,
    });

    await recallAndScore({
      recall: mockRecall,
      chat: mockChat,
      analytics: mockAnalytics,
      screenDescription: 'The user is looking at Discover',
      messages: normalConversationMessages,
      logger: mockLogger,
      signal,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      recallRankingEventType,
      expect.objectContaining({ scoredDocuments: [{ esScore: 0.8, llmScore: 7 }] })
    );
  });
});
