/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { OutputAPI } from '@kbn/inference-common';
import type { RanExperiment, ImprovementSuggestionAnalysisResult } from '../types';
import { createAnalysisStep, createBatchAnalysisStep, type AnalysisStepInput } from './analysis';

// Mock the improvement analyzer
const mockAnalyze = jest.fn();
const mockAnalyzeLlm = jest.fn();
const mockAnalyzeHeuristic = jest.fn();
const mockMergeResults = jest.fn();

jest.mock('../utils/improvement_analyzer', () => ({
  createImprovementAnalyzer: () => ({
    analyze: mockAnalyze,
    analyzeLlm: mockAnalyzeLlm,
    analyzeHeuristic: mockAnalyzeHeuristic,
    mergeResults: mockMergeResults,
  }),
}));

// Mock p-limit
jest.mock('p-limit', () => {
  const pLimit =
    () =>
    <T>(fn: () => Promise<T>) =>
      fn();
  pLimit.default = pLimit;
  return pLimit;
});

describe('analysis', () => {
  const mockLog: jest.Mocked<SomeDevLog> = {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as any;

  const mockOutput: jest.Mocked<OutputAPI> = jest.fn().mockResolvedValue({
    output: { suggestions: [] },
  });

  const createMockExperiment = (overrides: Partial<RanExperiment> = {}): RanExperiment => ({
    id: 'exp-123',
    datasetId: 'ds-123',
    datasetName: 'test-dataset',
    runs: {
      'run-0-0': {
        exampleIndex: 0,
        repetition: 0,
        input: { query: 'test' },
        expected: { answer: 'expected' },
        metadata: {},
        output: { response: 'actual' },
      },
    },
    evaluationRuns: [
      {
        name: 'TestEvaluator',
        result: { score: 0.8 },
        runKey: 'run-0-0',
        exampleIndex: 0,
        repetition: 0,
      },
    ],
    ...overrides,
  });

  const createMockAnalysisResult = (
    overrides: Partial<ImprovementSuggestionAnalysisResult> = {}
  ): ImprovementSuggestionAnalysisResult => ({
    suggestions: [
      {
        id: 'suggestion-1',
        title: 'Improve response quality',
        description: 'Response quality can be improved by...',
        category: 'response_quality',
        impact: 'high',
        confidence: 'medium',
        evidence: [
          {
            evaluatorName: 'TestEvaluator',
            exampleIndices: [0],
            score: 0.5,
          },
        ],
        priorityScore: 0.8,
      },
    ],
    summary: {
      totalSuggestions: 1,
      byImpact: { high: 1, medium: 0, low: 0 },
      byCategory: {
        prompt: 0,
        tool_selection: 0,
        response_quality: 1,
        context_retrieval: 0,
        reasoning: 0,
        accuracy: 0,
        efficiency: 0,
        other: 0,
      },
      topPriority: [],
    },
    metadata: {
      runId: 'exp-123',
      datasetName: 'test-dataset',
      analyzedAt: new Date().toISOString(),
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyze.mockReset();
    mockAnalyzeLlm.mockReset();
    mockAnalyzeHeuristic.mockReset();
    mockMergeResults.mockReset();
  });

  describe('createAnalysisStep', () => {
    it('should create a step with default configuration', () => {
      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      expect(step).toBeDefined();
      expect(step.execute).toBeDefined();
      expect(step.getMethod).toBeDefined();
      expect(step.getAnalyzer).toBeDefined();
    });

    it('should return the configured method', () => {
      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      expect(step.getMethod()).toBe('heuristic');
    });

    it('should default to auto method', () => {
      const step = createAnalysisStep({
        log: mockLog,
        output: mockOutput,
        connectorId: 'test-connector',
      });

      expect(step.getMethod()).toBe('auto');
    });

    it('should throw error when LLM method requires output and connectorId', () => {
      expect(() =>
        createAnalysisStep({
          log: mockLog,
          method: 'llm',
        })
      ).toThrow('LLM analysis requires output API and connectorId to be configured');
    });

    it('should warn when auto method lacks LLM configuration', () => {
      createAnalysisStep({
        log: mockLog,
        method: 'auto',
      });

      expect(mockLog.warning).toHaveBeenCalledWith(
        expect.stringContaining('falling back to heuristic-only analysis')
      );
    });

    it('should return the analyzer instance', () => {
      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const analyzer = step.getAnalyzer();
      expect(analyzer).toBeDefined();
      expect(analyzer.analyze).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute heuristic analysis successfully', async () => {
      const analysisResult = createMockAnalysisResult();
      mockAnalyzeHeuristic.mockReturnValue(analysisResult);

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await step.execute({
        experiment: createMockExperiment(),
      });

      expect(result.status).toBe('completed');
      expect(result.analysisResult).toEqual(analysisResult);
      expect(result.suggestionCount).toBe(1);
      expect(result.highImpactCount).toBe(1);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute LLM analysis when configured', async () => {
      const analysisResult = createMockAnalysisResult();
      mockAnalyzeLlm.mockResolvedValue(analysisResult);

      const step = createAnalysisStep({
        log: mockLog,
        output: mockOutput,
        connectorId: 'test-connector',
        method: 'llm',
      });

      const result = await step.execute({
        experiment: createMockExperiment(),
      });

      expect(result.status).toBe('completed');
      expect(mockAnalyzeLlm).toHaveBeenCalled();
    });

    it('should execute auto analysis (combined) when configured', async () => {
      const analysisResult = createMockAnalysisResult();
      mockAnalyze.mockResolvedValue(analysisResult);

      const step = createAnalysisStep({
        log: mockLog,
        output: mockOutput,
        connectorId: 'test-connector',
        method: 'auto',
      });

      const result = await step.execute({
        experiment: createMockExperiment(),
      });

      expect(result.status).toBe('completed');
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should pass model to analyzer', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      await step.execute({
        experiment: createMockExperiment(),
        model: 'gpt-4',
      });

      expect(mockAnalyzeHeuristic).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        })
      );
    });

    it('should pass additionalContext to analyzer', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      await step.execute({
        experiment: createMockExperiment(),
        additionalContext: 'Focus on prompt improvements',
      });

      expect(mockAnalyzeHeuristic).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalContext: 'Focus on prompt improvements',
        })
      );
    });

    it('should pass focusCategories to analyzer', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      await step.execute({
        experiment: createMockExperiment(),
        focusCategories: ['prompt', 'accuracy'],
      });

      expect(mockAnalyzeHeuristic).toHaveBeenCalledWith(
        expect.objectContaining({
          focusCategories: ['prompt', 'accuracy'],
        })
      );
    });

    it('should invoke onStart callback', async () => {
      const onStart = jest.fn();
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        onStart,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should invoke onComplete callback with result', async () => {
      const onComplete = jest.fn();
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        onComplete,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          analysisResult: expect.any(Object),
        })
      );
    });

    it('should invoke onSuggestionsGenerated callback', async () => {
      const onSuggestionsGenerated = jest.fn();
      const analysisResult = createMockAnalysisResult();
      mockAnalyzeHeuristic.mockReturnValue(analysisResult);

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        onSuggestionsGenerated,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onSuggestionsGenerated).toHaveBeenCalledTimes(1);
      expect(onSuggestionsGenerated).toHaveBeenCalledWith(analysisResult);
    });

    it('should handle errors and return failed status', async () => {
      mockAnalyzeHeuristic.mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await step.execute({ experiment: createMockExperiment() });

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Analysis failed');
      expect(result.analysisResult).toBeUndefined();
    });

    it('should invoke onError callback on failure', async () => {
      const onError = jest.fn();
      mockAnalyzeHeuristic.mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        onError,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should invoke onComplete callback even on failure', async () => {
      const onComplete = jest.fn();
      mockAnalyzeHeuristic.mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        onComplete,
      });

      await step.execute({ experiment: createMockExperiment() });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.any(Error),
        })
      );
    });

    it('should count high-impact suggestions correctly', async () => {
      const analysisResult = createMockAnalysisResult({
        suggestions: [
          {
            id: 's1',
            title: 'High impact 1',
            description: '',
            category: 'prompt',
            impact: 'high',
            confidence: 'high',
            evidence: [],
          },
          {
            id: 's2',
            title: 'Medium impact',
            description: '',
            category: 'prompt',
            impact: 'medium',
            confidence: 'high',
            evidence: [],
          },
          {
            id: 's3',
            title: 'High impact 2',
            description: '',
            category: 'prompt',
            impact: 'high',
            confidence: 'high',
            evidence: [],
          },
        ],
      });
      mockAnalyzeHeuristic.mockReturnValue(analysisResult);

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await step.execute({ experiment: createMockExperiment() });

      expect(result.suggestionCount).toBe(3);
      expect(result.highImpactCount).toBe(2);
    });

    it('should convert non-Error exceptions to Error objects', async () => {
      mockAnalyzeHeuristic.mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'String error';
      });

      const step = createAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await step.execute({ experiment: createMockExperiment() });

      expect(result.status).toBe('failed');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('String error');
    });
  });

  describe('createBatchAnalysisStep', () => {
    it('should create a batch step', () => {
      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      expect(batchStep.executeBatch).toBeDefined();
      expect(batchStep.getStep).toBeDefined();
      expect(batchStep.getMethod).toBeDefined();
      expect(batchStep.getAnalyzer).toBeDefined();
    });

    it('should execute batch in parallel by default', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        parallel: true,
      });

      const inputs: AnalysisStepInput[] = [
        { experiment: createMockExperiment({ id: 'exp-1' }) },
        { experiment: createMockExperiment({ id: 'exp-2' }) },
      ];

      const result = await batchStep.executeBatch(inputs);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should execute batch sequentially when parallel is false', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        parallel: false,
      });

      const inputs: AnalysisStepInput[] = [
        { experiment: createMockExperiment({ id: 'exp-1' }) },
        { experiment: createMockExperiment({ id: 'exp-2' }) },
      ];

      const result = await batchStep.executeBatch(inputs);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(2);
    });

    it('should aggregate suggestion counts across experiments', async () => {
      mockAnalyzeHeuristic
        .mockReturnValueOnce(
          createMockAnalysisResult({
            suggestions: [
              {
                id: 's1',
                title: 'High 1',
                description: '',
                category: 'prompt',
                impact: 'high',
                confidence: 'high',
                evidence: [],
              },
            ],
          })
        )
        .mockReturnValueOnce(
          createMockAnalysisResult({
            suggestions: [
              {
                id: 's2',
                title: 'Medium 1',
                description: '',
                category: 'prompt',
                impact: 'medium',
                confidence: 'high',
                evidence: [],
              },
              {
                id: 's3',
                title: 'High 2',
                description: '',
                category: 'prompt',
                impact: 'high',
                confidence: 'high',
                evidence: [],
              },
            ],
          })
        );

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await batchStep.executeBatch([
        { experiment: createMockExperiment() },
        { experiment: createMockExperiment() },
      ]);

      expect(result.totalSuggestionCount).toBe(3);
      expect(result.totalHighImpactCount).toBe(2);
    });

    it('should handle partial failures', async () => {
      mockAnalyzeHeuristic
        .mockReturnValueOnce(createMockAnalysisResult())
        .mockImplementationOnce(() => {
          throw new Error('Failed');
        });

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await batchStep.executeBatch([
        { experiment: createMockExperiment() },
        { experiment: createMockExperiment() },
      ]);

      expect(result.status).toBe('completed'); // At least one succeeded
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });

    it('should return failed status when all analyses fail', async () => {
      mockAnalyzeHeuristic.mockImplementation(() => {
        throw new Error('Failed');
      });

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await batchStep.executeBatch([
        { experiment: createMockExperiment() },
        { experiment: createMockExperiment() },
      ]);

      expect(result.status).toBe('failed');
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
    });

    it('should merge results when mergeResults is true', async () => {
      const mergedResult = createMockAnalysisResult({
        suggestions: [
          {
            id: 'merged-1',
            title: 'Merged suggestion',
            description: '',
            category: 'prompt',
            impact: 'high',
            confidence: 'high',
            evidence: [],
          },
        ],
      });
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());
      mockMergeResults.mockReturnValue(mergedResult);

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        mergeResults: true,
      });

      const result = await batchStep.executeBatch([
        { experiment: createMockExperiment() },
        { experiment: createMockExperiment() },
      ]);

      expect(mockMergeResults).toHaveBeenCalled();
      expect(result.mergedResult).toEqual(mergedResult);
    });

    it('should not merge results when mergeResults is false', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
        mergeResults: false,
      });

      const result = await batchStep.executeBatch([{ experiment: createMockExperiment() }]);

      expect(mockMergeResults).not.toHaveBeenCalled();
      expect(result.mergedResult).toBeUndefined();
    });

    it('should track total duration and timestamps', async () => {
      mockAnalyzeHeuristic.mockReturnValue(createMockAnalysisResult());

      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const result = await batchStep.executeBatch([{ experiment: createMockExperiment() }]);

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should return the underlying step', () => {
      const batchStep = createBatchAnalysisStep({
        log: mockLog,
        method: 'heuristic',
      });

      const step = batchStep.getStep();
      expect(step.execute).toBeDefined();
      expect(step.getMethod()).toBe('heuristic');
    });
  });
});
