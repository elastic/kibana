/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EvaluatorRegistry } from '../../evaluation_engine';
import type { ServerEvaluator } from '../../evaluation_engine';
import { runPairwiseExperiment } from '../pairwise_runner';
import type { PairwiseRunConfig } from '../pairwise_runner';

const createMockEvaluator = (name: string, scoresFn: () => number): ServerEvaluator => ({
  name,
  kind: 'CODE',
  description: `Mock evaluator: ${name}`,
  source: 'prebuilt',
  evaluate: jest.fn().mockImplementation(async () => ({
    evaluator: name,
    kind: 'CODE' as const,
    score: scoresFn(),
    label: 'pass',
  })),
});

describe('runPairwiseExperiment', () => {
  const logger = loggingSystemMock.createLogger();

  const buildConfig = (overrides: Partial<PairwiseRunConfig> = {}): PairwiseRunConfig => ({
    skillA: {
      id: 'skill-a',
      name: 'Skill A',
      description: 'First skill',
      markdown: '# Skill A content',
    },
    skillB: {
      id: 'skill-b',
      name: 'Skill B',
      description: 'Second skill',
      markdown: '# Skill B content',
    },
    examples: [
      { input: { query: 'test-1' }, output: 'expected-1' },
      { input: { query: 'test-2' }, output: 'expected-2' },
    ],
    evaluatorNames: ['eval-1'],
    connectorId: 'conn-1',
    repetitions: 1,
    ...overrides,
  });

  it('returns structured pairwise result with per-evaluator scores', async () => {
    const registry = new EvaluatorRegistry(logger);
    // Skill A always scores 0.9, Skill B always scores 0.6
    registry.register(createMockEvaluator('eval-1', () => 0.9));

    const config = buildConfig();
    const result = await runPairwiseExperiment(config, { evaluatorRegistry: registry, logger });

    expect(result.skill_a_id).toBe('skill-a');
    expect(result.skill_b_id).toBe('skill-b');
    expect(result.per_evaluator).toHaveLength(1);
    expect(result.per_evaluator[0].evaluator).toBe('eval-1');
    expect(result.aggregate_winner).toBeDefined();
    expect(result.significance).toBeDefined();
    expect(result.significance.significant).toEqual(expect.any(Boolean));
    expect(result.details.total_examples).toBe(2);
    expect(result.details.total_evaluators).toBe(1);
    expect(result.details.repetitions).toBe(1);
    expect(result.details.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });

  it('detects A_better when skill A consistently scores higher', async () => {
    const registry = new EvaluatorRegistry(logger);
    let callCount = 0;
    // First 2 calls (skill A items) score 0.9, next 2 (skill B items) score 0.3
    registry.register(
      createMockEvaluator('eval-1', () => {
        callCount++;
        return callCount <= 2 ? 0.9 : 0.3;
      })
    );

    const result = await runPairwiseExperiment(buildConfig(), {
      evaluatorRegistry: registry,
      logger,
    });

    expect(result.per_evaluator[0].direction).toBe('A_better');
    expect(result.per_evaluator[0].delta).toBeGreaterThan(0);
    expect(result.aggregate_winner).toBe('A');
  });

  it('detects B_better when skill B consistently scores higher', async () => {
    const registry = new EvaluatorRegistry(logger);
    let callCount = 0;
    // First 2 calls (skill A items) score 0.2, next 2 (skill B items) score 0.8
    registry.register(
      createMockEvaluator('eval-1', () => {
        callCount++;
        return callCount <= 2 ? 0.2 : 0.8;
      })
    );

    const result = await runPairwiseExperiment(buildConfig(), {
      evaluatorRegistry: registry,
      logger,
    });

    expect(result.per_evaluator[0].direction).toBe('B_better');
    expect(result.per_evaluator[0].delta).toBeLessThan(0);
    expect(result.aggregate_winner).toBe('B');
  });

  it('returns tie when scores are identical', async () => {
    const registry = new EvaluatorRegistry(logger);
    registry.register(createMockEvaluator('eval-1', () => 0.5));

    const result = await runPairwiseExperiment(buildConfig(), {
      evaluatorRegistry: registry,
      logger,
    });

    expect(result.per_evaluator[0].direction).toBe('tie');
    expect(result.aggregate_winner).toBe('tie');
    expect(result.significance.significant).toBe(false);
  });

  it('handles multiple evaluators', async () => {
    const registry = new EvaluatorRegistry(logger);
    let callCountEval1 = 0;
    let callCountEval2 = 0;

    registry.register(
      createMockEvaluator('eval-1', () => {
        callCountEval1++;
        return callCountEval1 <= 2 ? 0.8 : 0.4;
      })
    );
    registry.register(
      createMockEvaluator('eval-2', () => {
        callCountEval2++;
        return callCountEval2 <= 2 ? 0.6 : 0.7;
      })
    );

    const config = buildConfig({ evaluatorNames: ['eval-1', 'eval-2'] });
    const result = await runPairwiseExperiment(config, {
      evaluatorRegistry: registry,
      logger,
    });

    expect(result.per_evaluator).toHaveLength(2);
    expect(result.details.total_evaluators).toBe(2);
  });

  it('handles partial failure gracefully when skill A evaluation fails', async () => {
    const registry = new EvaluatorRegistry(logger);
    let callCount = 0;
    registry.register({
      name: 'eval-1',
      kind: 'CODE',
      description: 'test',
      source: 'prebuilt',
      evaluate: jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Evaluation engine failure');
        }
        return { evaluator: 'eval-1', kind: 'CODE', score: 0.7, label: 'pass' };
      }),
    });

    const result = await runPairwiseExperiment(buildConfig(), {
      evaluatorRegistry: registry,
      logger,
    });

    // Should still complete — the runner catches per-item errors and returns null scores
    expect(result).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });
});
