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
          esql: 'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | WHERE errors > 10',
          title: 'Error rate',
          category: 'error',
          severity_score: 65,
        },
      ] as unknown as KIQueryGenerationOutput,
    } as { input: KIQueryGenerationEvaluationExample['input']; output: KIQueryGenerationOutput; expected: Record<string, unknown>; metadata: null });

    expect(result.score).toBe(0.8);
    expect(innerEvaluate).toHaveBeenCalledTimes(1);

    const passedOutput = innerEvaluate.mock.calls[0][0].output;
    expect(passedOutput).toHaveLength(1);
    expect(passedOutput[0].title).toBe('Error rate');
  });
});
