/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gateCandidate } from './gate';
import type { ExampleRun, RunSummary } from './runner';

const run = (seedId: string, rewards: number[]): ExampleRun[] =>
  rewards.map((reward, rollout) => ({
    exampleId: seedId,
    seedId,
    provenance: 'test',
    rollout,
    question: seedId,
    goldQuery: '',
    goldExecutable: true,
    score: {
      astValid: true,
      executes: true,
      resultEquivalence: reward,
      rowCount: 1,
      goldRowCount: 1,
      reward,
    },
    latencyMs: 1,
    inputTokens: 100,
    outputTokens: 10,
    costUsd: 0.001,
  }));

const summary = (label: string, runs: ExampleRun[]): RunSummary => ({
  label,
  configHash: label,
  runs,
  meanReward: runs.reduce((total, item) => total + item.score.reward, 0) / runs.length,
  meanExecutes: 1,
  meanResultEquivalence: 1,
  meanTries: 1,
  totalInputTokens: runs.length * 100,
  totalOutputTokens: runs.length * 10,
  totalCostUsd: runs.length * 0.001,
  meanLatencyMs: 1,
  rewardByProvenance: {},
});

describe('gateCandidate regressions', () => {
  it('does not count a seed that only flipped on one rollout', () => {
    const incumbent = summary('incumbent', [...run('a', [1, 1]), ...run('b', [1, 0])]);
    const candidate = summary('candidate', [...run('a', [1, 1]), ...run('b', [0, 1])]);

    const result = gateCandidate({ incumbent, candidate });
    expect(result.regressions).toEqual([]);
  });

  it('counts a seed that got worse on every rollout', () => {
    const incumbent = summary('incumbent', [...run('a', [1, 1]), ...run('b', [1, 1])]);
    const candidate = summary('candidate', [...run('a', [1, 1]), ...run('b', [0, 0])]);

    const result = gateCandidate({ incumbent, candidate });
    expect(result.regressions).toEqual(['b']);
  });
});
