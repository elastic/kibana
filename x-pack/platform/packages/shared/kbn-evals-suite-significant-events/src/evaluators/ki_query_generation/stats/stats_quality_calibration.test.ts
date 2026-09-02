/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import { createStatsQualityCalibrationEvaluator } from './stats_quality_calibration';
import type { KIQueryGenerationEvaluationExample, KIQueryGenerationOutput } from '../types';

const createMockCriteriaFn = () => {
  const innerEvaluate = jest.fn().mockResolvedValue({ score: 0.8, explanation: 'LLM result' });

  const criteriaFn = jest.fn(
    (_criteria: EvaluationCriterion[]) =>
      ({
        name: 'mock_criteria',
        kind: 'LLM',
        direction: 'maximize',
        evaluate: innerEvaluate,
      } as unknown as Evaluator)
  );

  return { criteriaFn, innerEvaluate };
};

const baseParams = {
  input: { sample_logs: [] },
  expected: {},
  metadata: null,
};

describe('stats_quality_calibration evaluator', () => {
  it('returns null when no STATS queries exist', async () => {
    const { criteriaFn, innerEvaluate } = createMockCriteriaFn();
    const evaluator = createStatsQualityCalibrationEvaluator({ criteriaFn });

    const result = await evaluator.evaluate({
      ...baseParams,
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'Match only',
          category: 'error',
          severity_score: 50,
        },
      ] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBeNull();
    expect(innerEvaluate).not.toHaveBeenCalled();
  });

  it('returns null when output is empty', async () => {
    const { criteriaFn, innerEvaluate } = createMockCriteriaFn();
    const evaluator = createStatsQualityCalibrationEvaluator({ criteriaFn });

    const result = await evaluator.evaluate({
      ...baseParams,
      output: [] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBeNull();
    expect(innerEvaluate).not.toHaveBeenCalled();
  });

  it('delegates to LLM evaluator when STATS queries exist', async () => {
    const { criteriaFn, innerEvaluate } = createMockCriteriaFn();
    const evaluator = createStatsQualityCalibrationEvaluator({ criteriaFn });

    const result = await evaluator.evaluate({
      ...baseParams,
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'Match query',
          category: 'error',
          severity_score: 50,
        },
        {
          esql: 'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value',
          title: 'Error rate',
          category: 'error',
          severity_score: 65,
        },
      ] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBe(0.8);
    expect(innerEvaluate).toHaveBeenCalledTimes(1);

    const passedOutput = innerEvaluate.mock.calls[0][0].output;
    expect(passedOutput.generated.stats_queries).toHaveLength(1);
    expect(passedOutput.generated.stats_queries[0].title).toBe('Error rate');
    expect(passedOutput.generated.match_queries).toHaveLength(1);
    expect(passedOutput.existing_queries).toEqual([]);
  });

  it('splits generated queries into stats and match buckets', async () => {
    const { criteriaFn, innerEvaluate } = createMockCriteriaFn();
    const evaluator = createStatsQualityCalibrationEvaluator({ criteriaFn });

    const result = await evaluator.evaluate({
      ...baseParams,
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'Match one',
          category: 'error',
          severity_score: 50,
        },
        {
          esql: 'FROM logs | WHERE body.text:"slow"',
          title: 'Match two',
          category: 'error',
          severity_score: 50,
        },
        {
          esql: 'FROM logs | WHERE body.text:"auth"',
          title: 'Match three',
          category: 'error',
          severity_score: 50,
        },
        {
          esql: 'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value',
          title: 'Error rate',
          category: 'error',
          severity_score: 65,
        },
        {
          esql: 'FROM logs | STATS latency = AVG(duration_ms) BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = latency | KEEP bucket, metric_value',
          title: 'Latency p50',
          category: 'error',
          severity_score: 65,
        },
      ] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBe(0.8);
    const passedOutput = innerEvaluate.mock.calls[0][0].output;
    expect(passedOutput.generated.stats_queries).toHaveLength(2);
    expect(passedOutput.generated.stats_queries.map((q: { title: string }) => q.title)).toEqual([
      'Error rate',
      'Latency p50',
    ]);
    expect(passedOutput.generated.match_queries).toHaveLength(3);
    expect(passedOutput.generated.match_queries.map((q: { title: string }) => q.title)).toEqual([
      'Match one',
      'Match two',
      'Match three',
    ]);
  });

  it('judges an empty match bucket as a legitimate FAIL when no seeds exist', async () => {
    const { criteriaFn, innerEvaluate } = createMockCriteriaFn();
    const evaluator = createStatsQualityCalibrationEvaluator({ criteriaFn });

    const result = await evaluator.evaluate({
      ...baseParams,
      output: [
        {
          esql: 'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value',
          title: 'Error rate',
          category: 'error',
          severity_score: 65,
        },
      ] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBe(0.8);
    expect(innerEvaluate).toHaveBeenCalledTimes(1);
    const passedOutput = innerEvaluate.mock.calls[0][0].output;
    expect(passedOutput.generated.match_queries).toEqual([]);
    expect(passedOutput.existing_queries).toEqual([]);
  });

  it('passes seeded existing queries to the judge on rerun arms', async () => {
    const { criteriaFn, innerEvaluate } = createMockCriteriaFn();
    const evaluator = createStatsQualityCalibrationEvaluator({ criteriaFn });

    const seededExistingQueries = [
      {
        id: 'seed-1',
        title: 'Existing error rate',
        type: 'stats',
        severity_score: 70,
        description: 'An existing STATS query',
        esql: 'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
      },
      {
        id: 'seed-2',
        title: 'Existing error match',
        type: 'match',
        severity_score: 70,
        description: 'An existing match query',
        esql: 'FROM logs | WHERE log.level == "ERROR"',
      },
    ];

    const result = await evaluator.evaluate({
      input: { sample_logs: [], existing_queries: seededExistingQueries },
      expected: {},
      metadata: null,
      output: [
        {
          esql: 'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value',
          title: 'Error rate',
          category: 'error',
          severity_score: 65,
        },
      ] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBe(0.8);
    const passedOutput = innerEvaluate.mock.calls[0][0].output;
    expect(passedOutput.existing_queries).toEqual(seededExistingQueries);
    expect(passedOutput.generated.stats_queries).toHaveLength(1);
  });
});
