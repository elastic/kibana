/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalTraceCorrelation, EvaluationResult } from '../types';
import type { PreprocessedTrace } from './improvement_suggestions/trace_preprocessor';
import {
  checkEvaluationFailure,
  getFailedEvaluationTraces,
  getFailedEvaluationTraceIds,
  groupFailedCorrelationsByEvaluator,
  groupFailedCorrelationsByCriterion,
  formatFailedEvaluationsSummary,
  type FailureDetectionCriteria,
} from './failed_evaluation_traces';

describe('failed_evaluation_traces', () => {
  const createMockTrace = (traceId: string): PreprocessedTrace => ({
    traceId,
    rootOperation: 'test-operation',
    spans: [],
    metrics: {
      totalDurationMs: 100,
      spanCount: 1,
      llmCallCount: 1,
      toolCallCount: 0,
      errorCount: 0,
      tokens: { input: 100, output: 50, cached: 0, total: 150 },
      latencyByKind: {},
      modelsUsed: ['gpt-4'],
      toolsCalled: [],
    },
    errorSpans: [],
    llmSpans: [],
    toolSpans: [],
  });

  const createCorrelation = (
    overrides: Partial<EvalTraceCorrelation> = {}
  ): EvalTraceCorrelation => ({
    traceId: 'trace-123',
    exampleIndex: 0,
    repetition: 0,
    runKey: 'run-0-0',
    input: { query: 'test query' },
    expected: 'expected output',
    output: 'actual output',
    evaluationResults: {},
    trace: createMockTrace('trace-123'),
    ...overrides,
  });

  describe('checkEvaluationFailure', () => {
    it('should return null for passing score', () => {
      const result: EvaluationResult = { score: 0.8 };
      expect(checkEvaluationFailure(result)).toBeNull();
    });

    it('should detect failure when score is below threshold', () => {
      const result: EvaluationResult = { score: 0.3 };
      const failure = checkEvaluationFailure(result);

      expect(failure).not.toBeNull();
      expect(failure?.criterion).toBe('score_below_threshold');
      expect(failure?.score).toBe(0.3);
    });

    it('should use custom score threshold', () => {
      const result: EvaluationResult = { score: 0.6 };
      const criteria: FailureDetectionCriteria = { scoreThreshold: 0.7 };

      expect(checkEvaluationFailure(result, criteria)).not.toBeNull();
      expect(checkEvaluationFailure({ score: 0.8 }, criteria)).toBeNull();
    });

    it('should detect zero score when using zero comparison', () => {
      const result: EvaluationResult = { score: 0 };
      const criteria: FailureDetectionCriteria = { scoreComparison: 'zero' };

      const failure = checkEvaluationFailure(result, criteria);
      expect(failure?.criterion).toBe('zero_score');
    });

    it('should detect belowOrEqual scores', () => {
      const criteria: FailureDetectionCriteria = {
        scoreThreshold: 0.5,
        scoreComparison: 'belowOrEqual',
      };

      expect(checkEvaluationFailure({ score: 0.5 }, criteria)).not.toBeNull();
      expect(checkEvaluationFailure({ score: 0.51 }, criteria)).toBeNull();
    });

    it('should detect failure labels', () => {
      const result: EvaluationResult = { score: 0.8, label: 'Failed' };
      const failure = checkEvaluationFailure(result);

      expect(failure).not.toBeNull();
      expect(failure?.criterion).toBe('failure_label');
    });

    it('should be case-insensitive for labels', () => {
      expect(checkEvaluationFailure({ score: 0.8, label: 'FAILED' })).not.toBeNull();
      expect(checkEvaluationFailure({ score: 0.8, label: 'incorrect' })).not.toBeNull();
      expect(checkEvaluationFailure({ score: 0.8, label: 'ERROR' })).not.toBeNull();
    });

    it('should allow custom failure labels', () => {
      const criteria: FailureDetectionCriteria = { failureLabels: ['bad', 'terrible'] };

      expect(checkEvaluationFailure({ score: 0.8, label: 'bad' }, criteria)).not.toBeNull();
      expect(checkEvaluationFailure({ score: 0.8, label: 'failed' }, criteria)).toBeNull();
    });

    it('should handle null scores based on treatNullScoreAsFailed', () => {
      const result: EvaluationResult = { score: null };

      expect(checkEvaluationFailure(result)).toBeNull();
      expect(checkEvaluationFailure(result, { treatNullScoreAsFailed: true })).not.toBeNull();
    });

    it('should check labels when score is null', () => {
      const result: EvaluationResult = { score: null, label: 'failed' };
      const failure = checkEvaluationFailure(result);

      expect(failure).not.toBeNull();
      expect(failure?.criterion).toBe('failure_label');
    });
  });

  describe('getFailedEvaluationTraces', () => {
    it('should return empty results when no correlations provided', () => {
      const result = getFailedEvaluationTraces({ correlations: [] });

      expect(result.failedCorrelations).toHaveLength(0);
      expect(result.traces).toHaveLength(0);
      expect(result.summary.totalCorrelations).toBe(0);
      expect(result.summary.failureRate).toBe(0);
    });

    it('should identify failed evaluations', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          traceId: 'trace-1',
          runKey: 'run-0-0',
          evaluationResults: {
            correctness: { score: 0.3 },
          },
          trace: createMockTrace('trace-1'),
        }),
        createCorrelation({
          traceId: 'trace-2',
          runKey: 'run-0-1',
          evaluationResults: {
            correctness: { score: 0.9 },
          },
          trace: createMockTrace('trace-2'),
        }),
      ];

      const result = getFailedEvaluationTraces({ correlations });

      expect(result.failedCorrelations).toHaveLength(1);
      expect(result.failedCorrelations[0].traceId).toBe('trace-1');
      expect(result.traces).toHaveLength(1);
      expect(result.summary.failedCount).toBe(1);
      expect(result.summary.passedCount).toBe(1);
    });

    it('should filter by specific evaluator names', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          evaluationResults: {
            correctness: { score: 0.3 },
            relevance: { score: 0.8 },
          },
        }),
      ];

      const result = getFailedEvaluationTraces({
        correlations,
        evaluatorNames: ['relevance'],
      });

      expect(result.failedCorrelations).toHaveLength(0);
    });

    it('should use AND logic when requireAllEvaluatorsFailed is true', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          traceId: 'trace-1',
          evaluationResults: {
            correctness: { score: 0.3 },
            relevance: { score: 0.8 },
          },
        }),
        createCorrelation({
          traceId: 'trace-2',
          evaluationResults: {
            correctness: { score: 0.3 },
            relevance: { score: 0.3 },
          },
        }),
      ];

      const result = getFailedEvaluationTraces({
        correlations,
        evaluatorNames: ['correctness', 'relevance'],
        requireAllEvaluatorsFailed: true,
      });

      expect(result.failedCorrelations).toHaveLength(1);
      expect(result.failedCorrelations[0].traceId).toBe('trace-2');
    });

    it('should include correlations with trace errors when includeTraceErrors is true', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          traceError: 'Failed to fetch trace',
          trace: undefined,
        }),
      ];

      const result = getFailedEvaluationTraces({
        correlations,
        includeTraceErrors: true,
      });

      expect(result.failedCorrelations).toHaveLength(1);
      expect(result.failedCorrelations[0].hasTraceError).toBe(true);
      expect(result.summary.traceErrorCount).toBe(1);
    });

    it('should respect limit option', () => {
      const correlations: EvalTraceCorrelation[] = Array.from({ length: 10 }, (_, i) =>
        createCorrelation({
          traceId: `trace-${i}`,
          runKey: `run-0-${i}`,
          evaluationResults: { correctness: { score: 0.3 } },
          trace: createMockTrace(`trace-${i}`),
        })
      );

      const result = getFailedEvaluationTraces({
        correlations,
        limit: 3,
      });

      expect(result.failedCorrelations).toHaveLength(3);
    });

    it('should provide accurate summary statistics', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          traceId: 'trace-1',
          evaluationResults: {
            correctness: { score: 0.3 },
            relevance: { score: 0.3 },
          },
          trace: createMockTrace('trace-1'),
        }),
        createCorrelation({
          traceId: 'trace-2',
          evaluationResults: {
            correctness: { score: 0.8 },
            relevance: { score: 0.9 },
          },
          trace: createMockTrace('trace-2'),
        }),
      ];

      const result = getFailedEvaluationTraces({ correlations });

      expect(result.summary.totalCorrelations).toBe(2);
      expect(result.summary.failedCount).toBe(1);
      expect(result.summary.passedCount).toBe(1);
      expect(result.summary.failureRate).toBe(0.5);
      expect(result.summary.failuresByEvaluator).toEqual({
        correctness: 1,
        relevance: 1,
      });
    });

    it('should collect failure reasons', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          evaluationResults: {
            correctness: { score: 0.3, explanation: 'Incorrect answer' },
          },
        }),
      ];

      const result = getFailedEvaluationTraces({ correlations });

      expect(result.failedCorrelations[0].failureReasons).toHaveLength(1);
      expect(result.failedCorrelations[0].failureReasons[0]).toMatchObject({
        evaluatorName: 'correctness',
        score: 0.3,
        explanation: 'Incorrect answer',
        criterion: 'score_below_threshold',
      });
    });
  });

  describe('getFailedEvaluationTraceIds', () => {
    it('should return trace IDs for failed evaluations', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          traceId: 'trace-fail',
          evaluationResults: { correctness: { score: 0.3 } },
          trace: createMockTrace('trace-fail'),
        }),
        createCorrelation({
          traceId: 'trace-pass',
          evaluationResults: { correctness: { score: 0.8 } },
          trace: createMockTrace('trace-pass'),
        }),
      ];

      const traceIds = getFailedEvaluationTraceIds({ correlations });

      expect(traceIds).toEqual(['trace-fail']);
    });

    it('should exclude correlations with trace errors', () => {
      const correlations: EvalTraceCorrelation[] = [
        createCorrelation({
          traceId: 'trace-error',
          evaluationResults: { correctness: { score: 0.3 } },
          traceError: 'Failed to fetch',
          trace: undefined,
        }),
      ];

      const traceIds = getFailedEvaluationTraceIds({ correlations });

      expect(traceIds).toHaveLength(0);
    });
  });

  describe('groupFailedCorrelationsByEvaluator', () => {
    it('should group correlations by evaluator name', () => {
      const result = getFailedEvaluationTraces({
        correlations: [
          createCorrelation({
            traceId: 'trace-1',
            evaluationResults: {
              correctness: { score: 0.3 },
              relevance: { score: 0.3 },
            },
          }),
          createCorrelation({
            traceId: 'trace-2',
            evaluationResults: {
              correctness: { score: 0.2 },
            },
          }),
        ],
      });

      const grouped = groupFailedCorrelationsByEvaluator(result.failedCorrelations);

      expect(grouped.get('correctness')).toHaveLength(2);
      expect(grouped.get('relevance')).toHaveLength(1);
    });
  });

  describe('groupFailedCorrelationsByCriterion', () => {
    it('should group correlations by failure criterion', () => {
      const result = getFailedEvaluationTraces({
        correlations: [
          createCorrelation({
            evaluationResults: {
              correctness: { score: 0.3 },
            },
          }),
          createCorrelation({
            evaluationResults: {
              relevance: { score: 0.8, label: 'failed' },
            },
          }),
        ],
      });

      const grouped = groupFailedCorrelationsByCriterion(result.failedCorrelations);

      expect(grouped.get('score_below_threshold')).toHaveLength(1);
      expect(grouped.get('failure_label')).toHaveLength(1);
    });
  });

  describe('formatFailedEvaluationsSummary', () => {
    it('should generate readable summary', () => {
      const result = getFailedEvaluationTraces({
        correlations: [
          createCorrelation({
            evaluationResults: {
              correctness: { score: 0.3 },
            },
          }),
          createCorrelation({
            evaluationResults: {
              correctness: { score: 0.8 },
            },
          }),
        ],
      });

      const summary = formatFailedEvaluationsSummary(result);

      expect(summary).toContain('Failed Evaluations Summary');
      expect(summary).toContain('Total correlations: 2');
      expect(summary).toContain('Failed: 1');
      expect(summary).toContain('Passed: 1');
      expect(summary).toContain('correctness: 1');
    });
  });
});
