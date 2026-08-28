/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import { ToolingLog } from '@kbn/tooling-log';
import type { EvaluationExperimentSummary, EvaluationScoreDocument } from '@kbn/evals-common';
import type { EvalsClient, ExperimentStats } from '@kbn/evals';
import {
  pickLatestExperimentPerModel,
  experimentStatsToDatasets,
  queryMatrixScores,
  scoresByPrefixToDatasets,
} from './query_matrix_scores';

const experiment = (
  overrides: Partial<EvaluationExperimentSummary> & { modelId?: string }
): EvaluationExperimentSummary => {
  const { modelId, ...rest } = overrides;
  return {
    experiment_id: 'exp',
    timestamp: '2026-06-10T00:00:00.000Z',
    task_model: modelId ? { id: modelId, family: 'fam', provider: 'prov' } : undefined,
    ...rest,
  } as EvaluationExperimentSummary;
};

describe('pickLatestExperimentPerModel', () => {
  it('keeps the most recent experiment per model', () => {
    const result = pickLatestExperimentPerModel([
      experiment({ experiment_id: 'old', modelId: 'm1', timestamp: '2026-06-01T00:00:00.000Z' }),
      experiment({ experiment_id: 'new', modelId: 'm1', timestamp: '2026-06-09T00:00:00.000Z' }),
      experiment({ experiment_id: 'other', modelId: 'm2', timestamp: '2026-06-05T00:00:00.000Z' }),
    ]);

    expect(result.get('m1')?.experiment_id).toBe('new');
    expect(result.get('m2')?.experiment_id).toBe('other');
  });

  it('ignores experiments without a task model id', () => {
    const result = pickLatestExperimentPerModel([
      experiment({ experiment_id: 'no-model', modelId: undefined }),
    ]);
    expect(result.size).toBe(0);
  });

  it('drops experiments older than the lookback window', () => {
    const now = Date.parse('2026-06-15T00:00:00.000Z');
    const result = pickLatestExperimentPerModel(
      [
        experiment({
          experiment_id: 'stale',
          modelId: 'm1',
          timestamp: '2026-05-01T00:00:00.000Z',
        }),
        experiment({
          experiment_id: 'fresh',
          modelId: 'm2',
          timestamp: '2026-06-14T00:00:00.000Z',
        }),
      ],
      { lookbackDays: 14, now }
    );

    expect(result.has('m1')).toBe(false);
    expect(result.get('m2')?.experiment_id).toBe('fresh');
  });

  it('drops experiments with unparseable timestamps instead of treating them as epoch 0', () => {
    const now = Date.parse('2026-06-15T00:00:00.000Z');
    const result = pickLatestExperimentPerModel(
      [
        experiment({ experiment_id: 'broken', modelId: 'm1', timestamp: 'not-a-date' }),
        experiment({
          experiment_id: 'fresh',
          modelId: 'm1',
          timestamp: '2026-06-14T00:00:00.000Z',
        }),
      ],
      { lookbackDays: 14, now }
    );

    expect(result.get('m1')?.experiment_id).toBe('fresh');
  });
});

describe('experimentStatsToDatasets', () => {
  it('groups evaluator stats by dataset with mean + count', () => {
    const stats: ExperimentStats = {
      taskModel: { id: 'm1' },
      evaluatorModel: { id: 'judge' },
      totalRepetitions: 1,
      stats: [
        {
          datasetId: 'd1',
          datasetName: 'D1',
          evaluatorName: 'correctness',
          stats: { mean: 0.9, median: 0.9, stdDev: 0, min: 0.9, max: 0.9, count: 10 },
        },
        {
          datasetId: 'd1',
          datasetName: 'D1',
          evaluatorName: 'groundedness',
          stats: { mean: 0.8, median: 0.8, stdDev: 0, min: 0.8, max: 0.8, count: 10 },
        },
        {
          datasetId: 'd2',
          datasetName: 'D2',
          evaluatorName: 'correctness',
          stats: { mean: 0.7, median: 0.7, stdDev: 0, min: 0.7, max: 0.7, count: 5 },
        },
      ],
    };

    expect(experimentStatsToDatasets(stats)).toEqual([
      {
        datasetId: 'd1',
        datasetName: 'D1',
        evaluators: [
          { evaluatorName: 'correctness', mean: 0.9, count: 10, min: 0.9, max: 0.9 },
          { evaluatorName: 'groundedness', mean: 0.8, count: 10, min: 0.8, max: 0.8 },
        ],
      },
      {
        datasetId: 'd2',
        datasetName: 'D2',
        evaluators: [{ evaluatorName: 'correctness', mean: 0.7, count: 5, min: 0.7, max: 0.7 }],
      },
    ]);
  });
});

describe('queryMatrixScores', () => {
  const log = new ToolingLog() as unknown as SomeDevLog;

  const stats: ExperimentStats = {
    taskModel: { id: 'm1' },
    evaluatorModel: { id: 'judge' },
    totalRepetitions: 1,
    stats: [
      {
        datasetId: 'd1',
        datasetName: 'D1',
        evaluatorName: 'correctness',
        stats: { mean: 0.9, median: 0.9, stdDev: 0, min: 0.9, max: 0.9, count: 10 },
      },
    ],
  };

  const createClient = (
    experimentsByModel: Record<string, EvaluationExperimentSummary[]>
  ): { client: EvalsClient; listExperiments: jest.Mock; getExperimentStats: jest.Mock } => {
    const listExperiments = jest
      .fn()
      .mockImplementation(async ({ taskModelId }: { taskModelId?: string }) =>
        taskModelId ? experimentsByModel[taskModelId] ?? [] : []
      );
    const getExperimentStats = jest.fn().mockResolvedValue(stats);
    const client = { listExperiments, getExperimentStats } as unknown as EvalsClient;
    return { client, listExperiments, getExperimentStats };
  };

  it('queries each (suite, model) pair through the route model_id filter', async () => {
    const { client, listExperiments, getExperimentStats } = createClient({
      m1: [experiment({ experiment_id: 'exp-m1', modelId: 'm1' })],
      m2: [experiment({ experiment_id: 'exp-m2', modelId: 'm2' })],
    });

    const result = await queryMatrixScores(client, log, {
      suiteIds: ['suite-a'],
      modelIds: ['m1', 'm2'],
      branch: 'main',
    });

    expect(listExperiments).toHaveBeenCalledTimes(2);
    expect(listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ suiteId: 'suite-a', taskModelId: 'm1', branch: 'main' })
    );
    expect(listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ suiteId: 'suite-a', taskModelId: 'm2', branch: 'main' })
    );
    expect(getExperimentStats).toHaveBeenCalledTimes(2);
    expect(result.map((model) => model.modelId).sort()).toEqual(['m1', 'm2']);
  });

  it('reads a suite from its branch override instead of the global branch', async () => {
    const { client, listExperiments } = createClient({
      m1: [experiment({ experiment_id: 'exp-m1', modelId: 'm1' })],
    });

    await queryMatrixScores(client, log, {
      suiteIds: ['persona-suite', 'migrations-suite'],
      modelIds: ['m1'],
      branch: 'main',
      branchBySuite: { 'migrations-suite': 'feat/matrix-v3' },
    });

    expect(listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ suiteId: 'persona-suite', branch: 'main' })
    );
    expect(listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ suiteId: 'migrations-suite', branch: 'feat/matrix-v3' })
    );
  });

  it('picks the newest experiment within the lookback window per model', async () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const stale = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { client, getExperimentStats } = createClient({
      // Route returns newest first; the stale one would be picked by a naive per_page: 1
      // request if the newest ever fell outside the window.
      m1: [
        experiment({ experiment_id: 'recent', modelId: 'm1', timestamp: recent }),
        experiment({ experiment_id: 'stale', modelId: 'm1', timestamp: stale }),
      ],
    });

    const result = await queryMatrixScores(client, log, {
      suiteIds: ['suite-a'],
      modelIds: ['m1'],
      lookbackDays: 7,
    });

    expect(getExperimentStats).toHaveBeenCalledWith(
      'recent',
      expect.objectContaining({ suiteId: 'suite-a', taskModelId: 'm1' })
    );
    expect(result[0].suites[0].experimentId).toBe('recent');
  });

  it('omits models with no experiment inside the lookback window', async () => {
    const stale = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { client, getExperimentStats } = createClient({
      m1: [experiment({ experiment_id: 'stale', modelId: 'm1', timestamp: stale })],
    });

    const result = await queryMatrixScores(client, log, {
      suiteIds: ['suite-a'],
      modelIds: ['m1'],
      lookbackDays: 7,
    });

    expect(getExperimentStats).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe('scoresByPrefixToDatasets', () => {
  const score = (exampleId: string, evaluatorName: string, s: number) =>
    ({
      example: { id: exampleId, index: 0, dataset: { id: 'ds', name: 'DS' } },
      task: { model: { id: 'm1' }, trace_id: 't' },
      evaluator: { name: evaluatorName, score: s },
      metadata: {},
    } as unknown as EvaluationScoreDocument);

  it('buckets docs by example.id prefix and computes per-evaluator means', () => {
    const datasets = scoresByPrefixToDatasets(
      [
        score('alert-analysis-a', 'correctness', 1),
        score('alert-analysis-b', 'correctness', 0),
        score('threat-hunting-a', 'correctness', 0.5),
        score('threat-hunting-b', 'groundedness', 0.8),
      ],
      ['alert-analysis', 'threat-hunting']
    );

    const byId = new Map(datasets.map((d) => [d.datasetId, d]));
    expect(byId.get('prefix:alert-analysis')?.evaluators).toEqual([
      { evaluatorName: 'correctness', mean: 0.5, count: 2 },
    ]);
    expect(byId.get('prefix:threat-hunting')?.evaluators).toEqual(
      expect.arrayContaining([
        { evaluatorName: 'correctness', mean: 0.5, count: 1 },
        { evaluatorName: 'groundedness', mean: 0.8, count: 1 },
      ])
    );
  });

  it('matches exact example ids and prefix-dash boundaries only', () => {
    const datasets = scoresByPrefixToDatasets(
      [score('alert-analysis', 'correctness', 1), score('alert-analysisx', 'correctness', 0)],
      ['alert-analysis']
    );
    // 'alert-analysisx' must NOT match prefix 'alert-analysis'
    expect(datasets).toHaveLength(1);
    expect(datasets[0].evaluators[0].count).toBe(1);
  });

  it('skips docs without evaluator score', () => {
    const datasets = scoresByPrefixToDatasets(
      [
        {
          ...score('alert-analysis-a', 'correctness', 1),
          evaluator: { name: 'x' },
        } as EvaluationScoreDocument,
      ],
      ['alert-analysis']
    );
    expect(datasets).toEqual([]);
  });
});

describe('queryMatrixScores with examplePrefixes', () => {
  const log = new ToolingLog() as unknown as SomeDevLog;

  const stats: ExperimentStats = {
    taskModel: { id: 'm1' },
    evaluatorModel: { id: 'judge' },
    totalRepetitions: 1,
    stats: [
      {
        datasetId: 'd1',
        datasetName: 'D1',
        evaluatorName: 'correctness',
        stats: { mean: 0.9, median: 0.9, stdDev: 0, min: 0.9, max: 0.9, count: 10 },
      },
    ],
  };

  const createClient = (): { client: EvalsClient; getExperimentScores: jest.Mock } => {
    const listExperiments = jest.fn().mockResolvedValue([
      {
        experiment_id: 'e1',
        execution_id: 'x1',
        timestamp: new Date().toISOString(),
        task_model: { id: 'm1' },
      },
    ]);
    const getExperimentStats = jest.fn().mockResolvedValue(stats);
    const getExperimentScores = jest.fn().mockResolvedValue([
      {
        example: { id: 'alert-analysis-a', index: 0, dataset: { id: 'd1', name: 'D1' } },
        task: { model: { id: 'm1' }, trace_id: 't' },
        evaluator: { name: 'correctness', score: 0.6 },
        metadata: {},
      },
    ]);
    const client = {
      listExperiments,
      getExperimentStats,
      getExperimentScores,
    } as unknown as EvalsClient;
    return { client, getExperimentScores };
  };

  it('fetches per-example scores and appends synthetic prefix datasets when prefixes requested', async () => {
    const { client, getExperimentScores } = createClient();

    const result = await queryMatrixScores(client, log, {
      suiteIds: ['suite-a'],
      modelIds: ['m1'],
      examplePrefixes: ['alert-analysis'],
    });

    expect(getExperimentScores).toHaveBeenCalledWith('e1', expect.anything());
    const datasetIds = result[0].suites[0].datasets.map((d) => d.datasetId);
    expect(datasetIds).toContain('d1');
    expect(datasetIds).toContain('prefix:alert-analysis');
  });

  it('does not fetch per-example scores when no prefixes requested', async () => {
    const { client, getExperimentScores } = createClient();

    await queryMatrixScores(client, log, { suiteIds: ['suite-a'], modelIds: ['m1'] });

    expect(getExperimentScores).not.toHaveBeenCalled();
  });

  it('degrades gracefully when the scores route fails', async () => {
    const listExperiments = jest.fn().mockResolvedValue([
      {
        experiment_id: 'e1',
        execution_id: 'x1',
        timestamp: new Date().toISOString(),
        task_model: { id: 'm1' },
      },
    ]);
    const getExperimentStats = jest.fn().mockResolvedValue(stats);
    const getExperimentScores = jest.fn().mockRejectedValue(new Error('route down'));
    const client = {
      listExperiments,
      getExperimentStats,
      getExperimentScores,
    } as unknown as EvalsClient;

    const result = await queryMatrixScores(client, log, {
      suiteIds: ['suite-a'],
      modelIds: ['m1'],
      examplePrefixes: ['alert-analysis'],
    });

    expect(result[0].suites[0].datasets.map((d) => d.datasetId)).toEqual(['d1']);
  });
});
