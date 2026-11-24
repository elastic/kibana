/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreService } from '../../storage/scores/evaluation_score_service';
import type { OnlineScoreService } from '../../storage/scores/online_score_service';
import { sampleScores, selectSample, type SampleCandidate } from './sampler';

const candidate = (traceId: string, label: string): SampleCandidate => ({
  source: { source: 'online', monitor_id: 'monitor-1', trace_id: traceId },
  score: { label },
});

const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

describe('selectSample', () => {
  const candidates = [
    ...Array.from({ length: 20 }, (_, i) => candidate(`pass-${i}`, 'pass')),
    ...Array.from({ length: 2 }, (_, i) => candidate(`fail-${i}`, 'fail')),
  ];

  it('returns at most sampleSize distinct candidates and leaves the input untouched', () => {
    const before = candidates.map(({ source }) => source.trace_id);

    const picked = selectSample(candidates, 8, 'uniform', seededRandom(1));

    expect(picked).toHaveLength(8);
    expect(new Set(picked.map(({ source }) => source.trace_id)).size).toBe(8);
    expect(candidates.map(({ source }) => source.trace_id)).toEqual(before);
  });

  it('returns every candidate when fewer exist than requested', () => {
    expect(selectSample(candidates, 100, 'uniform', seededRandom(1))).toHaveLength(22);
  });

  it('represents the rare label when stratifying by label', () => {
    const picked = selectSample(candidates, 4, 'stratified_by_label', seededRandom(7));

    expect(picked.filter(({ score }) => score.label === 'fail')).toHaveLength(2);
    expect(picked.filter(({ score }) => score.label === 'pass')).toHaveLength(2);
  });

  it('fills the rest from the larger stratum once a small one is exhausted', () => {
    const picked = selectSample(candidates, 10, 'stratified_by_label', seededRandom(3));

    expect(picked).toHaveLength(10);
    expect(picked.filter(({ score }) => score.label === 'fail')).toHaveLength(2);
  });
});

describe('sampleScores', () => {
  const evaluator = { name: 'correctness', version: '1.0.0' };

  const hit = (source: Record<string, unknown>) => ({ _source: source });

  it('scopes an experiment query to the space, evaluator version and experiment, and skips scores with no trace', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          hit({
            experiment_id: 'exp-1',
            example: { id: 'ex-1' },
            task: { trace_id: 'trace-1', repetition_index: 2 },
            evaluator: { score: 0.5, label: 'pass' },
          }),
          hit({ experiment_id: 'exp-1', evaluator: { score: 1 } }),
        ],
      },
    });

    const items = await sampleScores({
      evaluationScoreService: { search } as unknown as EvaluationScoreService,
      onlineScoreService: {} as OnlineScoreService,
      queueId: 'queue-1',
      spaceId: 'space-a',
      sourceFilter: { source: 'experiment', experiment_id: 'exp-1' },
      evaluator,
      sampleSize: 5,
      strategy: 'uniform',
    });

    expect(items).toEqual([
      {
        queue_id: 'queue-1',
        position: 0,
        evaluator,
        source: {
          source: 'experiment',
          experiment_id: 'exp-1',
          example_id: 'ex-1',
          repetition_index: 2,
          trace_id: 'trace-1',
        },
        score: { value: 0.5, label: 'pass' },
      },
    ]);

    const { query } = search.mock.calls[0][0];
    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { 'evaluator.name': 'correctness' } },
        { term: { 'evaluator.version': '1.0.0' } },
        { term: { experiment_id: 'exp-1' } },
      ])
    );
    expect(JSON.stringify(query)).toContain('space-a');
  });

  it('samples online scores for a monitor', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          hit({
            monitor: { id: 'monitor-1' },
            trace_id: 'trace-9',
            score: { value: 0, label: 'fail' },
          }),
        ],
      },
    });

    const items = await sampleScores({
      evaluationScoreService: {} as EvaluationScoreService,
      onlineScoreService: { search } as unknown as OnlineScoreService,
      queueId: 'queue-2',
      spaceId: 'default',
      sourceFilter: { source: 'online', monitor_id: 'monitor-1' },
      evaluator,
      sampleSize: 5,
      strategy: 'uniform',
    });

    expect(items).toEqual([
      {
        queue_id: 'queue-2',
        position: 0,
        evaluator,
        source: { source: 'online', monitor_id: 'monitor-1', trace_id: 'trace-9' },
        score: { value: 0, label: 'fail' },
      },
    ]);
    expect(search.mock.calls[0][0].query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { 'monitor.id': 'monitor-1' } }])
    );
  });
});
