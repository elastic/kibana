/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createImprovementAnalyzer, type AnalyzeExperimentInput } from './improvement_analyzer';
import type { RanExperiment, ImprovementSuggestion } from '../types';

describe('createImprovementAnalyzer', () => {
  const createMockExperiment = (overrides: Partial<RanExperiment> = {}): RanExperiment => ({
    id: 'exp-123',
    datasetId: 'dataset-1',
    datasetName: 'Test Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test query 1' },
        expected: { answer: 'expected answer 1' },
        metadata: null,
        output: { answer: 'actual answer 1' },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test query 2' },
        expected: { answer: 'expected answer 2' },
        metadata: null,
        output: { answer: 'actual answer 2' },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test query 3' },
        expected: { answer: 'expected answer 3' },
        metadata: null,
        output: { answer: 'actual answer 3' },
      },
    },
    evaluationRuns: [
      { name: 'Correctness', exampleIndex: 0, result: { score: 0.9, label: 'PASS' } },
      { name: 'Correctness', exampleIndex: 1, result: { score: 0.8, label: 'PASS' } },
      { name: 'Correctness', exampleIndex: 2, result: { score: 0.85, label: 'PASS' } },
      { name: 'Groundedness', exampleIndex: 0, result: { score: 0.7, label: 'PASS' } },
      { name: 'Groundedness', exampleIndex: 1, result: { score: 0.75, label: 'PASS' } },
      { name: 'Groundedness', exampleIndex: 2, result: { score: 0.72, label: 'PASS' } },
    ],
    ...overrides,
  });

  const createLowScoringExperiment = (): RanExperiment => ({
    id: 'exp-low-scores',
    datasetId: 'dataset-low',
    datasetName: 'Low Scoring Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { answer: 'expected' },
        metadata: null,
        output: { answer: 'actual' },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { answer: 'expected 2' },
        metadata: null,
        output: { answer: 'actual 2' },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { answer: 'expected 3' },
        metadata: null,
        output: { answer: 'actual 3' },
      },
    },
    evaluationRuns: [
      // Low scores for accuracy evaluator (below 0.7 threshold)
      { name: 'accuracy_check', exampleIndex: 0, result: { score: 0.3, label: 'FAIL' } },
      { name: 'accuracy_check', exampleIndex: 1, result: { score: 0.4, label: 'FAIL' } },
      { name: 'accuracy_check', exampleIndex: 2, result: { score: 0.35, label: 'FAIL' } },
      // Low scores for tool selection evaluator
      { name: 'tool_accuracy', exampleIndex: 0, result: { score: 0.5, label: 'FAIL' } },
      { name: 'tool_accuracy', exampleIndex: 1, result: { score: 0.45, label: 'FAIL' } },
      { name: 'tool_accuracy', exampleIndex: 2, result: { score: 0.48, label: 'FAIL' } },
    ],
  });

  const createHighVarianceExperiment = (): RanExperiment => ({
    id: 'exp-variance',
    datasetId: 'dataset-variance',
    datasetName: 'High Variance Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { answer: 'expected' },
        metadata: null,
        output: { answer: 'actual' },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { answer: 'expected 2' },
        metadata: null,
        output: { answer: 'actual 2' },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { answer: 'expected 3' },
        metadata: null,
        output: { answer: 'actual 3' },
      },
      'run-3': {
        exampleIndex: 3,
        repetition: 1,
        input: { query: 'test 4' },
        expected: { answer: 'expected 4' },
        metadata: null,
        output: { answer: 'actual 4' },
      },
    },
    evaluationRuns: [
      // High variance scores (std dev > 0.3)
      { name: 'reasoning_quality', exampleIndex: 0, result: { score: 0.2, label: 'FAIL' } },
      { name: 'reasoning_quality', exampleIndex: 1, result: { score: 0.95, label: 'PASS' } },
      { name: 'reasoning_quality', exampleIndex: 2, result: { score: 0.3, label: 'FAIL' } },
      { name: 'reasoning_quality', exampleIndex: 3, result: { score: 0.9, label: 'PASS' } },
    ],
  });

  const createMultiFailureExperiment = (): RanExperiment => ({
    id: 'exp-multi-failure',
    datasetId: 'dataset-multi',
    datasetName: 'Multi-Failure Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { answer: 'expected' },
        metadata: null,
        output: { answer: 'actual' },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { answer: 'expected 2' },
        metadata: null,
        output: { answer: 'actual 2' },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { answer: 'expected 3' },
        metadata: null,
        output: { answer: 'actual 3' },
      },
    },
    evaluationRuns: [
      // Example 0: fails multiple evaluators
      { name: 'correctness', exampleIndex: 0, result: { score: 0.3, label: 'FAIL' } },
      { name: 'groundedness', exampleIndex: 0, result: { score: 0.4, label: 'FAIL' } },
      { name: 'reasoning', exampleIndex: 0, result: { score: 0.5, label: 'FAIL' } },
      // Example 1: fails multiple evaluators
      { name: 'correctness', exampleIndex: 1, result: { score: 0.2, label: 'FAIL' } },
      { name: 'groundedness', exampleIndex: 1, result: { score: 0.35, label: 'FAIL' } },
      { name: 'reasoning', exampleIndex: 1, result: { score: 0.4, label: 'FAIL' } },
      // Example 2: passes
      { name: 'correctness', exampleIndex: 2, result: { score: 0.9, label: 'PASS' } },
      { name: 'groundedness', exampleIndex: 2, result: { score: 0.85, label: 'PASS' } },
      { name: 'reasoning', exampleIndex: 2, result: { score: 0.95, label: 'PASS' } },
    ],
  });

  describe('extractDatasetScore', () => {
    it('should extract dataset score from experiment', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment();

      const result = analyzer.extractDatasetScore(experiment);

      expect(result.id).toBe('dataset-1');
      expect(result.name).toBe('Test Dataset');
      expect(result.numExamples).toBe(3);
      expect(result.experimentId).toBe('exp-123');
      expect(result.evaluatorScores.size).toBe(2);
      expect(result.evaluatorScores.get('Correctness')).toEqual([0.9, 0.8, 0.85]);
      expect(result.evaluatorScores.get('Groundedness')).toEqual([0.7, 0.75, 0.72]);
    });

    it('should handle experiment without evaluation runs', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment({
        evaluationRuns: undefined,
      });

      const result = analyzer.extractDatasetScore(experiment);

      expect(result.evaluatorScores.size).toBe(0);
    });

    it('should use datasetId as name if datasetName is missing', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment({
        datasetName: undefined as unknown as string,
      });

      const result = analyzer.extractDatasetScore(experiment);

      expect(result.name).toBe('dataset-1');
    });

    it('should handle null scores as 0', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: null } },
          { name: 'Test', exampleIndex: 1, result: { score: 0.5 } },
        ],
      });

      const result = analyzer.extractDatasetScore(experiment);

      expect(result.evaluatorScores.get('Test')).toEqual([0, 0.5]);
    });
  });

  describe('extractExampleDetails', () => {
    it('should extract per-example details', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment();

      const result = analyzer.extractExampleDetails(experiment);

      expect(result).toHaveLength(3);
      expect(result[0].index).toBe(0);
      expect(result[0].evaluatorScores).toHaveProperty('Correctness');
      expect(result[0].evaluatorScores).toHaveProperty('Groundedness');
      expect(result[0].evaluatorScores.Correctness.score).toBe(0.9);
      expect(result[0].evaluatorScores.Groundedness.score).toBe(0.7);
    });

    it('should identify low-scoring evaluators based on threshold', () => {
      const analyzer = createImprovementAnalyzer({ lowScoreThreshold: 0.75 });
      const experiment = createMockExperiment();

      const result = analyzer.extractExampleDetails(experiment);

      // Groundedness scores are all < 0.75
      expect(result[0].lowScoringEvaluators).toContain('Groundedness');
      expect(result[1].lowScoringEvaluators).toEqual([]); // Groundedness 0.75 is not < 0.75
      expect(result[2].lowScoringEvaluators).toContain('Groundedness');
    });

    it('should detect errors (label ERROR or score 0)', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: 0.5, label: 'ERROR' } },
          { name: 'Test', exampleIndex: 1, result: { score: 0, label: 'FAIL' } },
          { name: 'Test', exampleIndex: 2, result: { score: 0.8, label: 'PASS' } },
        ],
      });

      const result = analyzer.extractExampleDetails(experiment);

      expect(result[0].hasErrors).toBe(true);
      expect(result[1].hasErrors).toBe(true);
      expect(result[2].hasErrors).toBe(false);
    });

    it('should handle experiment without runs', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment({
        runs: undefined,
        evaluationRuns: [],
      });

      const result = analyzer.extractExampleDetails(experiment);

      expect(result).toHaveLength(0);
    });
  });

  describe('analyzeHeuristic', () => {
    it('should generate suggestions for consistently low-scoring evaluators', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });
      const experiment = createLowScoringExperiment();
      const input: AnalyzeExperimentInput = { experiment };

      const result = analyzer.analyzeHeuristic(input);

      expect(result.suggestions.length).toBeGreaterThan(0);

      const accuracySuggestion = result.suggestions.find((s) =>
        s.title.toLowerCase().includes('accuracy_check')
      );
      expect(accuracySuggestion).toBeDefined();
      expect(accuracySuggestion?.category).toBe('accuracy');
      expect(accuracySuggestion?.impact).toBe('high'); // mean < 0.5
    });

    it('should generate suggestions for high variance evaluators', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });
      const experiment = createHighVarianceExperiment();
      const input: AnalyzeExperimentInput = { experiment };

      const result = analyzer.analyzeHeuristic(input);

      const varianceSuggestion = result.suggestions.find(
        (s) => s.title.toLowerCase().includes('inconsistent') || s.tags?.includes('variance')
      );
      expect(varianceSuggestion).toBeDefined();
      expect(varianceSuggestion?.tags).toContain('variance');
    });

    it('should generate suggestions for examples with multiple failing evaluators', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });
      const experiment = createMultiFailureExperiment();
      const input: AnalyzeExperimentInput = { experiment };

      const result = analyzer.analyzeHeuristic(input);

      const multiFailureSuggestion = result.suggestions.find(
        (s) => s.title.toLowerCase().includes('multiple') || s.tags?.includes('multi-failure')
      );
      expect(multiFailureSuggestion).toBeDefined();
      expect(multiFailureSuggestion?.category).toBe('other');
      expect(multiFailureSuggestion?.impact).toBe('high');
    });

    it('should respect maxSuggestions config', () => {
      const analyzer = createImprovementAnalyzer({
        maxSuggestions: 2,
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 1,
      });
      const experiment = createLowScoringExperiment();
      const input: AnalyzeExperimentInput = { experiment };

      const result = analyzer.analyzeHeuristic(input);

      expect(result.suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should include metadata in result', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment();
      const input: AnalyzeExperimentInput = {
        experiment,
        model: 'gpt-4',
      };

      const result = analyzer.analyzeHeuristic(input);

      expect(result.metadata.runId).toBe('exp-123');
      expect(result.metadata.datasetName).toBe('Test Dataset');
      expect(result.metadata.model).toBe('gpt-4');
      expect(result.metadata.analyzedAt).toBeDefined();
    });

    it('should not generate suggestions when scores are all good', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Test', exampleIndex: 0, result: { score: 0.9 } },
          { name: 'Test', exampleIndex: 1, result: { score: 0.85 } },
          { name: 'Test', exampleIndex: 2, result: { score: 0.95 } },
        ],
      });
      const input: AnalyzeExperimentInput = { experiment };

      const result = analyzer.analyzeHeuristic(input);

      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('createSummary', () => {
    it('should create summary with correct breakdowns', () => {
      const analyzer = createImprovementAnalyzer();

      const suggestions: ImprovementSuggestion[] = [
        {
          id: '1',
          title: 'Test 1',
          description: 'Desc 1',
          category: 'prompt',
          impact: 'high',
          confidence: 'high',
          evidence: [],
          priorityScore: 0.9,
        },
        {
          id: '2',
          title: 'Test 2',
          description: 'Desc 2',
          category: 'tool_selection',
          impact: 'medium',
          confidence: 'medium',
          evidence: [],
          priorityScore: 0.6,
        },
        {
          id: '3',
          title: 'Test 3',
          description: 'Desc 3',
          category: 'prompt',
          impact: 'low',
          confidence: 'low',
          evidence: [],
          priorityScore: 0.3,
        },
      ];

      const summary = analyzer.createSummary(suggestions);

      expect(summary.totalSuggestions).toBe(3);
      expect(summary.byImpact).toEqual({ high: 1, medium: 1, low: 1 });
      expect(summary.byCategory.prompt).toBe(2);
      expect(summary.byCategory.tool_selection).toBe(1);
      expect(summary.topPriority).toHaveLength(3);
      expect(summary.topPriority[0].id).toBe('1'); // highest priority
    });

    it('should limit topPriority to 5 items', () => {
      const analyzer = createImprovementAnalyzer();

      const suggestions: ImprovementSuggestion[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        title: `Test ${i}`,
        description: `Desc ${i}`,
        category: 'other' as const,
        impact: 'medium' as const,
        confidence: 'medium' as const,
        evidence: [],
        priorityScore: i * 0.1,
      }));

      const summary = analyzer.createSummary(suggestions);

      expect(summary.topPriority).toHaveLength(5);
    });
  });

  describe('analyze', () => {
    it('should run heuristic analysis when LLM is not configured', async () => {
      const analyzer = createImprovementAnalyzer({
        enableHeuristics: true,
      });
      const experiment = createLowScoringExperiment();
      const input: AnalyzeExperimentInput = { experiment };

      const result = await analyzer.analyze(input);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.metadata.analyzerModel).toBeUndefined();
    });

    it('should skip heuristic analysis when disabled', async () => {
      const analyzer = createImprovementAnalyzer({
        enableHeuristics: false,
      });
      const experiment = createLowScoringExperiment();
      const input: AnalyzeExperimentInput = { experiment };

      const result = await analyzer.analyze(input);

      // No LLM configured and heuristics disabled = no suggestions
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('analyzeMultiple', () => {
    it('should analyze multiple experiments', async () => {
      const analyzer = createImprovementAnalyzer({
        enableHeuristics: true,
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });

      const experiments = [createLowScoringExperiment(), createHighVarianceExperiment()];

      const inputs = experiments.map((experiment) => ({ experiment }));
      const results = await analyzer.analyzeMultiple(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].metadata.datasetName).toBe('Low Scoring Dataset');
      expect(results[1].metadata.datasetName).toBe('High Variance Dataset');
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple analysis results', () => {
      const analyzer = createImprovementAnalyzer();

      const result1 = {
        suggestions: [
          {
            id: '1',
            title: 'Unique suggestion 1',
            description: 'Desc 1',
            category: 'prompt' as const,
            impact: 'high' as const,
            confidence: 'high' as const,
            evidence: [{ evaluatorName: 'test', exampleIndices: [0] }],
            priorityScore: 0.8,
          },
        ],
        summary: {
          totalSuggestions: 1,
          byImpact: { high: 1, medium: 0, low: 0 },
          byCategory: {
            prompt: 1,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 0,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          runId: 'run-1',
          datasetName: 'Dataset 1',
          model: 'gpt-4',
          analyzedAt: '2025-01-01T00:00:00Z',
        },
      };

      const result2 = {
        suggestions: [
          {
            id: '2',
            title: 'Unique suggestion 2',
            description: 'Desc 2',
            category: 'accuracy' as const,
            impact: 'medium' as const,
            confidence: 'medium' as const,
            evidence: [{ evaluatorName: 'test2', exampleIndices: [1] }],
            priorityScore: 0.6,
          },
        ],
        summary: {
          totalSuggestions: 1,
          byImpact: { high: 0, medium: 1, low: 0 },
          byCategory: {
            prompt: 0,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 1,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          runId: 'run-2',
          datasetName: 'Dataset 2',
          model: 'gpt-4',
          analyzedAt: '2025-01-01T00:00:00Z',
        },
      };

      const merged = analyzer.mergeResults([result1, result2]);

      expect(merged.suggestions).toHaveLength(2);
      expect(merged.metadata.runId).toBe('run-1,run-2');
      expect(merged.metadata.datasetName).toContain('Dataset 1');
      expect(merged.metadata.datasetName).toContain('Dataset 2');
    });

    it('should deduplicate suggestions with same title', () => {
      const analyzer = createImprovementAnalyzer();

      const sharedSuggestion = {
        id: '1',
        title: 'Same Title',
        description: 'Desc',
        category: 'prompt' as const,
        impact: 'high' as const,
        confidence: 'high' as const,
        evidence: [{ evaluatorName: 'test', exampleIndices: [0] }],
        priorityScore: 0.5,
      };

      const result1 = {
        suggestions: [sharedSuggestion],
        summary: {
          totalSuggestions: 1,
          byImpact: { high: 1, medium: 0, low: 0 },
          byCategory: {
            prompt: 1,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 0,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          runId: 'run-1',
          datasetName: 'Dataset 1',
          analyzedAt: '2025-01-01T00:00:00Z',
        },
      };

      const result2 = {
        suggestions: [
          {
            ...sharedSuggestion,
            id: '2',
            evidence: [{ evaluatorName: 'test2', exampleIndices: [1] }],
          },
        ],
        summary: {
          totalSuggestions: 1,
          byImpact: { high: 1, medium: 0, low: 0 },
          byCategory: {
            prompt: 1,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 0,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          runId: 'run-2',
          datasetName: 'Dataset 2',
          analyzedAt: '2025-01-01T00:00:00Z',
        },
      };

      const merged = analyzer.mergeResults([result1, result2]);

      // Should deduplicate by title
      expect(merged.suggestions).toHaveLength(1);
      // Evidence should be merged
      expect(merged.suggestions[0].evidence).toHaveLength(2);
      // Priority should be boosted for recurring suggestions
      expect(merged.suggestions[0].priorityScore).toBeGreaterThan(0.5);
    });

    it('should throw error when merging empty array', () => {
      const analyzer = createImprovementAnalyzer();

      expect(() => analyzer.mergeResults([])).toThrow('Cannot merge empty results array');
    });

    it('should return single result as-is', () => {
      const analyzer = createImprovementAnalyzer();

      const result = {
        suggestions: [],
        summary: {
          totalSuggestions: 0,
          byImpact: { high: 0, medium: 0, low: 0 },
          byCategory: {
            prompt: 0,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 0,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          runId: 'run-1',
          datasetName: 'Dataset 1',
          analyzedAt: '2025-01-01T00:00:00Z',
        },
      };

      const merged = analyzer.mergeResults([result]);

      expect(merged).toBe(result);
    });
  });

  describe('category inference from evaluator names', () => {
    it('should infer tool_selection category from evaluator name', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'tool_accuracy', exampleIndex: 0, result: { score: 0.3 } },
          { name: 'tool_accuracy', exampleIndex: 1, result: { score: 0.4 } },
          { name: 'tool_accuracy', exampleIndex: 2, result: { score: 0.35 } },
        ],
      });

      const result = analyzer.analyzeHeuristic({ experiment });
      const toolSuggestion = result.suggestions.find((s) => s.category === 'tool_selection');

      expect(toolSuggestion).toBeDefined();
    });

    it('should infer reasoning category from evaluator name', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'reasoning_quality', exampleIndex: 0, result: { score: 0.3 } },
          { name: 'reasoning_quality', exampleIndex: 1, result: { score: 0.4 } },
          { name: 'reasoning_quality', exampleIndex: 2, result: { score: 0.35 } },
        ],
      });

      const result = analyzer.analyzeHeuristic({ experiment });
      const reasoningSuggestion = result.suggestions.find((s) => s.category === 'reasoning');

      expect(reasoningSuggestion).toBeDefined();
    });

    it('should infer context_retrieval category from RAG evaluator name', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'rag_context_recall', exampleIndex: 0, result: { score: 0.3 } },
          { name: 'rag_context_recall', exampleIndex: 1, result: { score: 0.4 } },
          { name: 'rag_context_recall', exampleIndex: 2, result: { score: 0.35 } },
        ],
      });

      const result = analyzer.analyzeHeuristic({ experiment });
      const contextSuggestion = result.suggestions.find((s) => s.category === 'context_retrieval');

      expect(contextSuggestion).toBeDefined();
    });

    it('should infer efficiency category from latency evaluator name', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });

      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'latency_score', exampleIndex: 0, result: { score: 0.3 } },
          { name: 'latency_score', exampleIndex: 1, result: { score: 0.4 } },
          { name: 'latency_score', exampleIndex: 2, result: { score: 0.35 } },
        ],
      });

      const result = analyzer.analyzeHeuristic({ experiment });
      const efficiencySuggestion = result.suggestions.find((s) => s.category === 'efficiency');

      expect(efficiencySuggestion).toBeDefined();
    });
  });

  describe('priority score calculation', () => {
    it('should assign higher priority to high impact suggestions', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 1,
      });

      // Create experiment with very low scores (high impact)
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'test_eval', exampleIndex: 0, result: { score: 0.1 } },
          { name: 'test_eval', exampleIndex: 1, result: { score: 0.2 } },
          { name: 'test_eval', exampleIndex: 2, result: { score: 0.15 } },
        ],
      });

      const result = analyzer.analyzeHeuristic({ experiment });

      const suggestion = result.suggestions.find((s) => s.title.includes('test_eval'));
      expect(suggestion?.impact).toBe('high'); // mean < 0.5
      expect(suggestion?.priorityScore).toBeGreaterThan(0.5);
    });

    it('should sort suggestions by priority score', async () => {
      const analyzer = createImprovementAnalyzer({
        enableHeuristics: true,
        lowScoreThreshold: 0.7,
        minExamplesForSuggestion: 2,
      });

      const experiment = createLowScoringExperiment();
      const result = await analyzer.analyze({ experiment });

      // Verify suggestions are sorted by priority (descending)
      for (let i = 1; i < result.suggestions.length; i++) {
        const prevScore = result.suggestions[i - 1].priorityScore ?? 0;
        const currScore = result.suggestions[i].priorityScore ?? 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });
  });

  describe('configuration defaults', () => {
    it('should use default values when config is not provided', () => {
      const analyzer = createImprovementAnalyzer();
      const experiment = createMockExperiment({
        evaluationRuns: [
          // Score exactly at default threshold (0.7)
          { name: 'test', exampleIndex: 0, result: { score: 0.7 } },
          { name: 'test', exampleIndex: 1, result: { score: 0.7 } },
        ],
      });

      const details = analyzer.extractExampleDetails(experiment);

      // 0.7 is not < 0.7, so should not be flagged as low scoring
      expect(details[0].lowScoringEvaluators).not.toContain('test');
    });

    it('should allow overriding lowScoreThreshold', () => {
      const analyzer = createImprovementAnalyzer({
        lowScoreThreshold: 0.8,
      });
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'test', exampleIndex: 0, result: { score: 0.75 } },
          { name: 'test', exampleIndex: 1, result: { score: 0.75 } },
        ],
      });

      const details = analyzer.extractExampleDetails(experiment);

      // 0.75 is < 0.8, so should be flagged as low scoring
      expect(details[0].lowScoringEvaluators).toContain('test');
    });
  });
});
