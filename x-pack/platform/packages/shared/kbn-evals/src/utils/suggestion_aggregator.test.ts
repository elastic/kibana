/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createSuggestionAggregator,
  calculateJaccardSimilarity,
  calculateLevenshteinSimilarity,
  calculateCombinedSimilarity,
  type SuggestionAggregatorConfig,
} from './suggestion_aggregator';
import type { ImprovementSuggestion, ImprovementSuggestionAnalysisResult } from '../types';

describe('SuggestionAggregator', () => {
  const createMockSuggestion = (
    overrides: Partial<ImprovementSuggestion> = {}
  ): ImprovementSuggestion => ({
    id: `suggestion-${Math.random().toString(36).substring(7)}`,
    title: 'Improve tool selection accuracy',
    description: 'The tool selection shows inconsistent performance across examples.',
    category: 'tool_selection',
    impact: 'medium',
    confidence: 'medium',
    evidence: [
      {
        evaluatorName: 'tool_accuracy',
        exampleIndices: [0, 1, 2],
        score: 0.65,
        explanation: 'Low accuracy in tool selection',
      },
    ],
    actionItems: ['Review tool selection logic', 'Add more examples for edge cases'],
    priorityScore: 0.7,
    tags: ['tools', 'accuracy'],
    ...overrides,
  });

  const createMockAnalysisResult = (
    suggestions: ImprovementSuggestion[],
    runId: string = 'run-1',
    datasetName: string = 'dataset-1'
  ): ImprovementSuggestionAnalysisResult => ({
    suggestions,
    summary: {
      totalSuggestions: suggestions.length,
      byImpact: { high: 0, medium: suggestions.length, low: 0 },
      byCategory: {
        prompt: 0,
        tool_selection: suggestions.length,
        response_quality: 0,
        context_retrieval: 0,
        reasoning: 0,
        accuracy: 0,
        efficiency: 0,
        other: 0,
      },
      topPriority: suggestions.slice(0, 5),
    },
    metadata: {
      runId,
      datasetName,
      analyzedAt: new Date().toISOString(),
    },
  });

  describe('createSuggestionAggregator', () => {
    it('should create an aggregator with default config', () => {
      const aggregator = createSuggestionAggregator();
      expect(aggregator).toHaveProperty('aggregate');
      expect(aggregator).toHaveProperty('aggregateRaw');
      expect(aggregator).toHaveProperty('areDuplicates');
      expect(aggregator).toHaveProperty('calculateSimilarity');
      expect(aggregator).toHaveProperty('rank');
    });

    it('should accept custom config', () => {
      const config: SuggestionAggregatorConfig = {
        similarityThreshold: 0.9,
        maxSuggestions: 5,
        boostRecurring: false,
      };
      const aggregator = createSuggestionAggregator(config);
      expect(aggregator).toBeDefined();
    });
  });

  describe('aggregate', () => {
    it('should return empty result for empty input', () => {
      const aggregator = createSuggestionAggregator();
      const result = aggregator.aggregate([]);

      expect(result.suggestions).toHaveLength(0);
      expect(result.metadata.totalInputSuggestions).toBe(0);
      expect(result.metadata.experimentsAnalyzed).toBe(0);
    });

    it('should aggregate suggestions from single result', () => {
      const aggregator = createSuggestionAggregator();
      const suggestion = createMockSuggestion();
      const result = aggregator.aggregate([createMockAnalysisResult([suggestion])]);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].title).toBe(suggestion.title);
      expect(result.suggestions[0].recurrenceCount).toBe(1);
      expect(result.metadata.totalInputSuggestions).toBe(1);
      expect(result.metadata.uniqueSuggestions).toBe(1);
      expect(result.metadata.duplicatesMerged).toBe(0);
    });

    it('should deduplicate similar suggestions across experiments', () => {
      const aggregator = createSuggestionAggregator({ similarityThreshold: 0.7 });

      const suggestion1 = createMockSuggestion({
        id: 'sug-1',
        title: 'Improve tool selection accuracy',
      });

      const suggestion2 = createMockSuggestion({
        id: 'sug-2',
        title: 'Improve tool selection accuracy for better results',
      });

      const result = aggregator.aggregate([
        createMockAnalysisResult([suggestion1], 'run-1'),
        createMockAnalysisResult([suggestion2], 'run-2'),
      ]);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].recurrenceCount).toBe(2);
      expect(result.suggestions[0].sources).toHaveLength(2);
      expect(result.metadata.duplicatesMerged).toBe(1);
    });

    it('should keep distinct suggestions separate', () => {
      const aggregator = createSuggestionAggregator();

      const suggestion1 = createMockSuggestion({
        title: 'Improve tool selection accuracy',
        category: 'tool_selection',
      });

      const suggestion2 = createMockSuggestion({
        title: 'Optimize response formatting',
        category: 'response_quality',
      });

      const result = aggregator.aggregate([createMockAnalysisResult([suggestion1, suggestion2])]);

      expect(result.suggestions).toHaveLength(2);
      expect(result.metadata.duplicatesMerged).toBe(0);
    });

    it('should merge evidence from duplicate suggestions', () => {
      const aggregator = createSuggestionAggregator({ similarityThreshold: 0.7 });

      const suggestion1 = createMockSuggestion({
        evidence: [{ evaluatorName: 'eval1', exampleIndices: [0, 1], score: 0.5 }],
      });

      const suggestion2 = createMockSuggestion({
        evidence: [
          { evaluatorName: 'eval1', exampleIndices: [2, 3], score: 0.6 },
          { evaluatorName: 'eval2', exampleIndices: [0], score: 0.7 },
        ],
      });

      const result = aggregator.aggregate([
        createMockAnalysisResult([suggestion1], 'run-1'),
        createMockAnalysisResult([suggestion2], 'run-2'),
      ]);

      expect(result.suggestions).toHaveLength(1);
      const mergedEvidence = result.suggestions[0].evidence;
      expect(mergedEvidence).toHaveLength(2);

      const eval1Evidence = mergedEvidence.find((e) => e.evaluatorName === 'eval1');
      expect(eval1Evidence?.exampleIndices).toContain(0);
      expect(eval1Evidence?.exampleIndices).toContain(1);
      expect(eval1Evidence?.exampleIndices).toContain(2);
      expect(eval1Evidence?.exampleIndices).toContain(3);
      expect(eval1Evidence?.score).toBe(0.55); // Average of 0.5 and 0.6
    });

    it('should respect maxSuggestions config', () => {
      const aggregator = createSuggestionAggregator({ maxSuggestions: 2 });

      const suggestions = Array.from({ length: 5 }, (_, i) =>
        createMockSuggestion({
          title: `Suggestion ${i}`,
          category: i % 2 === 0 ? 'tool_selection' : 'accuracy',
        })
      );

      const result = aggregator.aggregate([createMockAnalysisResult(suggestions)]);

      expect(result.suggestions).toHaveLength(2);
    });

    it('should rank suggestions by aggregate score', () => {
      const aggregator = createSuggestionAggregator();

      const lowImpact = createMockSuggestion({
        title: 'Low impact suggestion',
        impact: 'low',
        confidence: 'low',
        category: 'other',
      });

      const highImpact = createMockSuggestion({
        title: 'High impact suggestion',
        impact: 'high',
        confidence: 'high',
        category: 'accuracy',
      });

      const result = aggregator.aggregate([createMockAnalysisResult([lowImpact, highImpact])]);

      expect(result.suggestions[0].title).toBe('High impact suggestion');
      expect(result.suggestions[1].title).toBe('Low impact suggestion');
    });

    it('should boost recurring suggestions when configured', () => {
      const aggregator = createSuggestionAggregator({
        boostRecurring: true,
        minRecurrenceForBoost: 2,
      });

      const recurringSuggestion = createMockSuggestion({
        title: 'Recurring issue',
        impact: 'medium',
      });

      const singleSuggestion = createMockSuggestion({
        title: 'Single occurrence',
        impact: 'high',
        category: 'accuracy',
      });

      const result = aggregator.aggregate([
        createMockAnalysisResult([recurringSuggestion], 'run-1'),
        createMockAnalysisResult([recurringSuggestion], 'run-2'),
        createMockAnalysisResult([singleSuggestion], 'run-3'),
      ]);

      // The recurring suggestion should have higher aggregate score due to recurrence boost
      const recurring = result.suggestions.find((s) => s.title === 'Recurring issue');
      expect(recurring?.recurrenceCount).toBe(2);
      expect(recurring?.aggregateScore).toBeGreaterThan(0);
    });

    it('should track metadata correctly', () => {
      const aggregator = createSuggestionAggregator();

      const result = aggregator.aggregate([
        createMockAnalysisResult([createMockSuggestion()], 'run-1', 'dataset-a'),
        createMockAnalysisResult(
          [createMockSuggestion({ title: 'Different title', category: 'accuracy' })],
          'run-2',
          'dataset-b'
        ),
      ]);

      expect(result.metadata.experimentsAnalyzed).toBe(2);
      expect(result.metadata.runIds).toContain('run-1');
      expect(result.metadata.runIds).toContain('run-2');
      expect(result.metadata.datasetNames).toContain('dataset-a');
      expect(result.metadata.datasetNames).toContain('dataset-b');
    });
  });

  describe('aggregateRaw', () => {
    it('should aggregate raw suggestions with metadata', () => {
      const aggregator = createSuggestionAggregator();

      const result = aggregator.aggregateRaw([
        {
          suggestions: [createMockSuggestion()],
          runId: 'run-1',
          datasetName: 'dataset-1',
        },
      ]);

      expect(result.suggestions).toHaveLength(1);
      expect(result.metadata.runIds).toContain('run-1');
    });
  });

  describe('areDuplicates', () => {
    it('should identify duplicate suggestions with same category and similar title', () => {
      const aggregator = createSuggestionAggregator({ similarityThreshold: 0.7 });

      const suggestion1 = createMockSuggestion({
        title: 'Improve tool selection accuracy',
        category: 'tool_selection',
      });

      const suggestion2 = createMockSuggestion({
        title: 'Improve tool selection accuracy for users',
        category: 'tool_selection',
      });

      expect(aggregator.areDuplicates(suggestion1, suggestion2)).toBe(true);
    });

    it('should not identify as duplicates when categories differ', () => {
      const aggregator = createSuggestionAggregator();

      const suggestion1 = createMockSuggestion({
        title: 'Improve accuracy',
        category: 'tool_selection',
      });

      const suggestion2 = createMockSuggestion({
        title: 'Improve accuracy',
        category: 'accuracy',
      });

      expect(aggregator.areDuplicates(suggestion1, suggestion2)).toBe(false);
    });

    it('should not identify as duplicates when titles are very different', () => {
      const aggregator = createSuggestionAggregator({ similarityThreshold: 0.8 });

      const suggestion1 = createMockSuggestion({
        title: 'Fix tool selection',
        category: 'tool_selection',
      });

      const suggestion2 = createMockSuggestion({
        title: 'Optimize response formatting',
        category: 'tool_selection',
      });

      expect(aggregator.areDuplicates(suggestion1, suggestion2)).toBe(false);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return high similarity for identical suggestions', () => {
      const aggregator = createSuggestionAggregator();
      const suggestion = createMockSuggestion();

      const similarity = aggregator.calculateSimilarity(suggestion, suggestion);
      expect(similarity).toBeCloseTo(1, 1);
    });

    it('should return lower similarity for different suggestions', () => {
      const aggregator = createSuggestionAggregator();

      const suggestion1 = createMockSuggestion({
        title: 'Improve tool selection',
        description: 'Tool selection needs improvement',
        category: 'tool_selection',
      });

      const suggestion2 = createMockSuggestion({
        title: 'Optimize response time',
        description: 'Response latency is too high',
        category: 'efficiency',
      });

      const similarity = aggregator.calculateSimilarity(suggestion1, suggestion2);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('rank', () => {
    it('should rank suggestions by calculated aggregate score', () => {
      const aggregator = createSuggestionAggregator();

      const suggestions = [
        createMockSuggestion({ impact: 'low', confidence: 'low' }),
        createMockSuggestion({ impact: 'high', confidence: 'high' }),
        createMockSuggestion({ impact: 'medium', confidence: 'medium' }),
      ];

      const ranked = aggregator.rank(suggestions);

      expect(ranked[0].impact).toBe('high');
      expect(ranked[1].impact).toBe('medium');
      expect(ranked[2].impact).toBe('low');
    });
  });

  describe('createSummary', () => {
    it('should create accurate summary statistics', () => {
      const aggregator = createSuggestionAggregator();

      const result = aggregator.aggregate([
        createMockAnalysisResult([
          createMockSuggestion({ impact: 'high', category: 'tool_selection' }),
          createMockSuggestion({ impact: 'medium', category: 'accuracy', title: 'Accuracy issue' }),
          createMockSuggestion({ impact: 'low', category: 'other', title: 'Other issue' }),
        ]),
      ]);

      expect(result.summary.totalSuggestions).toBe(3);
      expect(result.summary.byImpact.high).toBe(1);
      expect(result.summary.byImpact.medium).toBe(1);
      expect(result.summary.byImpact.low).toBe(1);
      expect(result.summary.byCategory.tool_selection).toBe(1);
      expect(result.summary.byCategory.accuracy).toBe(1);
      expect(result.summary.byCategory.other).toBe(1);
    });
  });
});

describe('Similarity utility functions', () => {
  describe('calculateJaccardSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateJaccardSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateJaccardSimilarity('hello world', 'foo bar baz')).toBe(0);
    });

    it('should return partial similarity for overlapping strings', () => {
      const similarity = calculateJaccardSimilarity(
        'improve tool selection',
        'improve response quality'
      );
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty strings', () => {
      expect(calculateJaccardSimilarity('', '')).toBe(1);
      expect(calculateJaccardSimilarity('hello', '')).toBe(0);
    });
  });

  describe('calculateLevenshteinSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateLevenshteinSimilarity('hello', 'hello')).toBe(1);
    });

    it('should return high similarity for similar strings', () => {
      const similarity = calculateLevenshteinSimilarity('hello', 'hallo');
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for different strings', () => {
      const similarity = calculateLevenshteinSimilarity('hello', 'world');
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('calculateCombinedSimilarity', () => {
    it('should combine Jaccard and Levenshtein similarities', () => {
      const combined = calculateCombinedSimilarity(
        'improve tool selection',
        'improve tool accuracy'
      );
      const jaccard = calculateJaccardSimilarity('improve tool selection', 'improve tool accuracy');
      const levenshtein = calculateLevenshteinSimilarity(
        'improve tool selection',
        'improve tool accuracy'
      );

      // Combined should be weighted average
      const expectedCombined = jaccard * 0.6 + levenshtein * 0.4;
      expect(combined).toBeCloseTo(expectedCombined, 5);
    });
  });
});
