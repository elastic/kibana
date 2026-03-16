/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calibrateThresholds } from './calibrate';
import type { EvaluationScoreRepository } from '../utils/score_repository';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { GateConfig } from './types';

const createMockLog = (): SomeDevLog =>
  ({
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }) as unknown as SomeDevLog;

const createMockRepository = (
  stats: {
    evaluatorName: string;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
  }[]
): EvaluationScoreRepository => {
  const runStats = {
    stats: stats.map((s) => ({
      datasetId: 'ds-1',
      datasetName: 'Dataset 1',
      evaluatorName: s.evaluatorName,
      stats: {
        mean: s.mean,
        median: s.mean,
        stdDev: s.stdDev,
        min: s.min,
        max: s.max,
        count: s.count,
      },
    })),
    taskModel: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
    evaluatorModel: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
    totalRepetitions: 1,
  };

  return {
    getStatsByRunId: jest.fn().mockResolvedValue(runStats),
  } as unknown as EvaluationScoreRepository;
};

describe('calibrateThresholds', () => {
  describe('bootstrap mode', () => {
    it('generates initial thresholds from run stats', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'criteria', mean: 0.85, stdDev: 0.05, min: 0.7, max: 1.0, count: 50 },
        { evaluatorName: 'correctness', mean: 0.9, stdDev: 0.03, min: 0.8, max: 1.0, count: 50 },
      ]);

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        mode: 'bootstrap',
      });

      expect(result.config.evaluators?.criteria?.avg).toBe(0.85);
      expect(result.config.evaluators?.criteria?.min).toBe(0.75);
      expect(result.config.evaluators?.correctness?.avg).toBe(0.9);
      expect(result.changes).toHaveLength(2);
    });

    it('floor never goes below zero', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'low', mean: 0.1, stdDev: 0.2, min: 0, max: 0.5, count: 10 },
      ]);

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        mode: 'bootstrap',
      });

      expect(result.config.evaluators?.low?.min).toBeGreaterThanOrEqual(0);
    });

    it('respects custom margin parameter', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'criteria', mean: 0.8, stdDev: 0.1, min: 0.5, max: 1.0, count: 20 },
      ]);

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        mode: 'bootstrap',
        margin: 1,
      });

      expect(result.config.evaluators?.criteria?.min).toBe(0.7);
    });

    it('sets global score threshold as average of all evaluator means', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'a', mean: 0.8, stdDev: 0.05, min: 0.7, max: 0.9, count: 10 },
        { evaluatorName: 'b', mean: 0.6, stdDev: 0.05, min: 0.5, max: 0.7, count: 10 },
      ]);

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        mode: 'bootstrap',
      });

      expect(result.config.score?.avg).toBe(0.7);
    });

    it('populates required_pass from evaluated evaluator names', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'criteria', mean: 0.9, stdDev: 0.01, min: 0.88, max: 0.92, count: 5 },
        { evaluatorName: 'latency', mean: 0.5, stdDev: 0.1, min: 0.3, max: 0.7, count: 5 },
      ]);

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        mode: 'bootstrap',
      });

      expect(result.config.required_pass).toContain('criteria');
      expect(result.config.required_pass).toContain('latency');
    });
  });

  describe('tighten mode', () => {
    it('raises thresholds when actuals exceed current config', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'criteria', mean: 0.95, stdDev: 0.02, min: 0.9, max: 1.0, count: 50 },
      ]);

      const existingConfig: GateConfig = {
        evaluators: { criteria: { avg: 0.85, min: 0.7 } },
      };

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        existingConfig,
        mode: 'tighten',
      });

      expect(result.config.evaluators?.criteria?.avg).toBe(0.95);
      expect(result.config.evaluators?.criteria?.min).toBe(0.7);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].previous).toBe(0.85);
    });

    it('does not lower thresholds when actuals are below current config', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'criteria', mean: 0.7, stdDev: 0.1, min: 0.5, max: 0.9, count: 50 },
      ]);

      const existingConfig: GateConfig = {
        evaluators: { criteria: { avg: 0.85, min: 0.7 } },
      };

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        existingConfig,
        mode: 'tighten',
      });

      expect(result.config.evaluators?.criteria?.avg).toBe(0.85);
      expect(result.changes).toHaveLength(0);
    });

    it('adds new evaluator thresholds not in existing config', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'new_eval', mean: 0.88, stdDev: 0.04, min: 0.75, max: 0.95, count: 20 },
      ]);

      const existingConfig: GateConfig = {
        evaluators: { old_eval: { avg: 0.9 } },
      };

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        existingConfig,
        mode: 'tighten',
      });

      expect(result.config.evaluators?.new_eval?.avg).toBe(0.88);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].previous).toBeUndefined();
    });

    it('preserves existing required_pass', async () => {
      const repo = createMockRepository([
        { evaluatorName: 'a', mean: 0.9, stdDev: 0.01, min: 0.88, max: 0.92, count: 5 },
      ]);

      const existingConfig: GateConfig = {
        required_pass: ['custom-evaluator'],
      };

      const result = await calibrateThresholds(repo, createMockLog(), {
        runId: 'run-1',
        existingConfig,
        mode: 'tighten',
      });

      expect(result.config.required_pass).toEqual(['custom-evaluator']);
    });
  });

  describe('error handling', () => {
    it('throws when run stats are not found', async () => {
      const repo = {
        getStatsByRunId: jest.fn().mockResolvedValue(null),
      } as unknown as EvaluationScoreRepository;

      await expect(
        calibrateThresholds(repo, createMockLog(), {
          runId: 'nonexistent',
          mode: 'bootstrap',
        })
      ).rejects.toThrow('No stats found for run ID "nonexistent"');
    });
  });
});
