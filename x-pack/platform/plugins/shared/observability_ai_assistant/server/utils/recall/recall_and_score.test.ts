/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecallAndScoreResult, recallAndScore } from './recall_and_score';
import * as scoreSuggestionsModule from './score_suggestions';
import { AnalyticsServiceStart } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { recallRankingEventType } from '../../analytics/recall_ranking';
import { BoundInferenceClient } from '@kbn/inference-plugin/server';
import { ObservabilityAIAssistantClient } from '../../service/client';
import { KnowledgeBaseHit } from '../../service/knowledge_base_service/types';
import { createMockInternalKbDoc } from './create_mock_internal_kb_doc';
import { recallMockData } from './mock_data';

const scoreSuggestions = jest.spyOn(scoreSuggestionsModule, 'scoreSuggestions');

const { contextualInsightsMessages, normalConversationMessages, sampleMessages } = recallMockData;

describe('recallAndScore', () => {
  const mockRecall: jest.MockedFn<ObservabilityAIAssistantClient['recall']> = jest.fn();
  const mockInferenceClient: jest.Mocked<BoundInferenceClient> = {
    output: jest.fn(),
    chatComplete: jest.fn(),
    getConnectorById: jest.fn(),
  };
  const mockLogger = { error: jest.fn(), debug: jest.fn() } as unknown as Logger;
  const mockAnalytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceStart;
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no documents are recalled', () => {
    let result: RecallAndScoreResult;

    const query = 'What is my favorite color?';

    beforeEach(async () => {
      mockRecall.mockResolvedValue([]);

      mockInferenceClient.output.mockResolvedValue({
        id: '',
        content: '',
        output: {
          queries: [
            {
              semantic: query,
            },
          ],
        },
      });

      result = await recallAndScore({
        recall: mockRecall,
        analytics: mockAnalytics,
        userPrompt: query,
        context: 'Some context',
        messages: sampleMessages,
        logger: mockLogger,
        signal,
        inferenceClient: mockInferenceClient,
      });
    });

    it('returns empty suggestions', async () => {
      expect(result).toEqual({
        entries: [],
        queries: [{ semantic: { query } }],
        selected: [],
      });
    });

    it('invokes recall with user prompt and screen context', async () => {
      expect(mockRecall).toHaveBeenCalledWith({
        limit: {
          tokenCount: 8000,
        },
        queries: [{ semantic: { query } }],
      });
    });

    it('does not score the suggestions', async () => {
      expect(scoreSuggestions).not.toHaveBeenCalled();
    });
  });

  it('handles errors when scoring fails', async () => {
    mockRecall.mockResolvedValue([
      createMockInternalKbDoc({
        id: 'doc1',
        text: 'doc1',
        score: 7,
      }),
    ]);

    mockInferenceClient.output.mockResolvedValue({
      id: '',
      content: '',
      output: {
        queries: [],
      },
    });

    scoreSuggestions.mockRejectedValue(new Error('Scoring failed'));

    const result = await recallAndScore({
      recall: mockRecall,
      analytics: mockAnalytics,
      userPrompt: 'test',
      context: 'context',
      messages: sampleMessages,
      logger: mockLogger,
      signal,
      inferenceClient: mockInferenceClient,
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error scoring documents: Scoring failed'),
      expect.any(Object)
    );
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].id).toBe('doc1');
  });

  it('calls scoreSuggestions with correct arguments', async () => {
    const recalledDocs: KnowledgeBaseHit[] = [
      createMockInternalKbDoc({
        id: 'doc1',
        text: 'Hello world',
        score: 0.8,
      }),
    ];

    mockRecall.mockResolvedValue(recalledDocs);
    scoreSuggestions.mockResolvedValue({
      scores: new Map([['doc1', 7]]),
      selected: recalledDocs.map((doc) => doc.id),
    });

    await recallAndScore({
      recall: mockRecall,
      inferenceClient: mockInferenceClient,
      analytics: mockAnalytics,
      userPrompt: 'test',
      context: 'context',
      messages: sampleMessages,
      logger: mockLogger,
      signal,
    });

    expect(scoreSuggestions).toHaveBeenCalledWith({
      entries: recalledDocs,
      logger: mockLogger,
      messages: sampleMessages,
      userPrompt: 'test',
      userMessageFunctionName: undefined,
      context: 'context',
      signal,
      inferenceClient: mockInferenceClient,
    });
  });

  it('handles the normal conversation flow correctly', async () => {
    const entry = createMockInternalKbDoc({
      id: 'fav_color',
      text: 'My favorite color is blue',
      score: 0.9,
    });

    mockRecall.mockResolvedValue([entry]);

    scoreSuggestions.mockResolvedValue({
      scores: new Map([['fav_color', 7]]),
      selected: ['fav_color'],
    });

    mockInferenceClient.output.mockResolvedValue({
      id: '',
      content: '',
      output: {
        queries: [],
      },
    });

    const result = await recallAndScore({
      recall: mockRecall,
      inferenceClient: mockInferenceClient,
      analytics: mockAnalytics,
      userPrompt: "What's my favourite color?",
      context: '',
      messages: normalConversationMessages,
      logger: mockLogger,
      signal,
    });

    expect(result.entries).toEqual([
      createMockInternalKbDoc({
        id: 'fav_color',
        text: 'My favorite color is blue',
        score: 0.9,
      }),
    ]);
    expect(mockRecall).toHaveBeenCalled();
    expect(scoreSuggestions).toHaveBeenCalled();
  });

  it('handles contextual insights conversation flow correctly', async () => {
    const entry = createMockInternalKbDoc({
      id: 'alert_cause',
      text: 'The alert was triggered due to high CPU usage.',
      score: 0.85,
    });
    mockRecall.mockResolvedValue([entry]);

    scoreSuggestions.mockResolvedValue({
      scores: new Map([['alert_cause', 6]]),
      selected: ['alert_cause'],
    });

    const result = await recallAndScore({
      recall: mockRecall,
      inferenceClient: mockInferenceClient,
      analytics: mockAnalytics,
      userPrompt: "I'm looking at an alert and trying to understand why it was triggered",
      context: 'User is analyzing an alert',
      messages: contextualInsightsMessages,
      logger: mockLogger,
      signal,
    });

    expect(result.entries).toEqual([entry]);
    expect(mockRecall).toHaveBeenCalled();
    expect(scoreSuggestions).toHaveBeenCalled();
  });

  it('reports analytics with the correct structure', async () => {
    const recalledDocs = [{ id: 'doc1', text: 'Hello world', score: 0.8 }];
    mockRecall.mockResolvedValue([
      createMockInternalKbDoc({
        id: 'doc1',
        text: 'Hello world',
        score: 0.8,
      }),
    ]);

    scoreSuggestions.mockResolvedValue({
      scores: new Map([['doc1', 7]]),
      selected: recalledDocs.map(({ id }) => id),
    });

    await recallAndScore({
      recall: mockRecall,
      inferenceClient: mockInferenceClient,
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
