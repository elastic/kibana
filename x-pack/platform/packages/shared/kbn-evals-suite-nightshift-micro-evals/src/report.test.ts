/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvalsClient } from '@kbn/evals';
import { KbnClient } from '@kbn/kbn-client';
import { ToolingLog } from '@kbn/tooling-log';
import { formatRuleSummary, createMicroReporter, type MicroExperiment } from './report';

it('prints Python rule formatting and the AND-joined task verdict', () => {
  expect(
    formatRuleSummary(
      'SyntheticTask',
      [
        { metric: 'metric', op: '>=', threshold: 0.91 },
        { metric: 'quality', op: '>=', threshold: 0.5 },
      ],
      { metric: 0.9667, quality: 0.5 },
      false
    )
  ).toEqual([
    'metric=0.967 >= 0.91 PASS',
    'quality=0.500 >= 0.5 PASS',
    'MICRO_EVAL_RESULT: SyntheticTask — PASS',
  ]);
});

it('reports a failed rule without throwing', () => {
  expect(
    formatRuleSummary(
      'SyntheticTask',
      [{ metric: 'metric', op: '>=', threshold: 0.91 }],
      { metric: 0.9 },
      false
    )
  ).toEqual(['metric=0.900 >= 0.91 FAIL', 'MICRO_EVAL_RESULT: SyntheticTask — FAIL']);
});

it('reports missing metrics as failures and warns when every example errored', () => {
  expect(
    formatRuleSummary('SyntheticTask', [{ metric: 'metric', op: '>=', threshold: 0.91 }], {}, true)
  ).toEqual([
    'metric: MISSING (no evaluator produced this metric) FAIL',
    'WARNING: every example errored; check the model/connector wiring.',
    'MICRO_EVAL_RESULT: SyntheticTask — FAIL',
  ]);
});

it('rounds binary half-boundaries like the Python driver', () => {
  expect(
    formatRuleSummary(
      'SyntheticTask',
      [{ metric: 'metric', op: '>=', threshold: 0 }],
      { metric: 0.0625 },
      false
    )[0]
  ).toBe('metric=0.062 >= 0 PASS');
});

it('reports shared metric names separately with permanent URLs and no execution-wide query', async () => {
  const log = new ToolingLog();
  const info = jest.spyOn(log, 'info');
  const client = new EvalsClient(new KbnClient({ url: 'http://localhost:5601', log }), log);
  const getStats = jest.spyOn(client, 'getExperimentStats').mockImplementation(async (id) => ({
    stats: [
      {
        datasetId: id,
        datasetName: id,
        evaluatorName: 'structural_validity',
        stats: {
          mean: id === 'extraction' ? 1 : 0,
          median: 0,
          stdDev: 0,
          min: 0,
          max: 1,
          count: 1,
        },
      },
    ],
    taskModel: { id: 'synthetic', family: 'synthetic', provider: 'synthetic' },
    totalRepetitions: 1,
  }));
  const experiments: MicroExperiment[] = ['extraction', 'merge'].map((id) => ({
    taskType: id,
    rules: [{ metric: 'structural_validity', op: '>=', threshold: 0.9 }],
    result: {
      id,
      experimentName: id,
      datasetId: id,
      datasetName: id,
      runs: {},
      evaluationRuns: [],
    },
  }));
  await createMicroReporter({
    experiments,
    resultsUrl: 'https://user:password@example.test/base/',
  })(client, 'extraction', log, {
    executionId: 'shared',
    taskModelId: 'synthetic',
    suiteId: 'micro',
  });
  expect(info).toHaveBeenCalledWith('structural_validity=1.000 >= 0.9 PASS');
  expect(info).toHaveBeenCalledWith('structural_validity=0.000 >= 0.9 FAIL');
  expect(info).toHaveBeenCalledWith('MICRO_EVAL_RESULT: extraction — PASS');
  expect(info).toHaveBeenCalledWith('MICRO_EVAL_RESULT: merge — FAIL');
  expect(info).toHaveBeenCalledWith(
    'KBN_EXPERIMENT_URL: https://example.test/base/app/management/ai/evals/experiments/extraction'
  );
  expect(info).toHaveBeenCalledWith(
    'KBN_EXPERIMENT_URL: https://example.test/base/app/management/ai/evals/experiments/merge'
  );
  expect(getStats.mock.calls.every(([, options]) => !options?.executionId)).toBe(true);
});
