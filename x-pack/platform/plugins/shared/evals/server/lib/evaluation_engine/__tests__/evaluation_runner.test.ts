/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EvaluatorRegistry } from '../evaluator_registry';
import { createEvaluationRunner } from '../evaluation_runner';
import type { ServerEvaluator } from '../evaluator_registry';

const createMockEvaluator = (overrides: Partial<ServerEvaluator> = {}): ServerEvaluator => ({
  name: 'test-code',
  kind: 'CODE',
  description: 'A test CODE evaluator',
  source: 'prebuilt',
  evaluate: jest.fn().mockResolvedValue({
    evaluator: 'test-code',
    kind: 'CODE',
    score: 1.0,
    label: 'pass',
  }),
  ...overrides,
});

describe('createEvaluationRunner', () => {
  const logger = loggingSystemMock.createLogger();
  let registry: EvaluatorRegistry;

  beforeEach(() => {
    registry = new EvaluatorRegistry(logger);
    jest.clearAllMocks();
  });

  it('runs evaluators against items and returns results', async () => {
    const evaluator = createMockEvaluator();
    registry.register(evaluator);

    const runner = createEvaluationRunner(registry, logger);
    const result = await runner.run({
      items: [{ input: { text: 'hello' }, output: 'world' }],
      evaluatorNames: ['test-code'],
      connectorId: 'conn-1',
    });

    expect(result.runId).toBeDefined();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].itemIndex).toBe(0);
    expect(result.results[0].evaluatorResults).toHaveLength(1);
    expect(result.results[0].evaluatorResults[0].score).toBe(1.0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });

  it('throws when evaluator is not found', async () => {
    const runner = createEvaluationRunner(registry, logger);

    await expect(
      runner.run({
        items: [{ input: { text: 'hello' }, output: 'world' }],
        evaluatorNames: ['nonexistent'],
        connectorId: 'conn-1',
      })
    ).rejects.toThrow('Evaluator not found: nonexistent');
  });

  it('runs CODE evaluators before LLM evaluators', async () => {
    const callOrder: string[] = [];
    const codeEvaluator = createMockEvaluator({
      name: 'code-eval',
      kind: 'CODE',
      evaluate: jest.fn().mockImplementation(async () => {
        callOrder.push('code');
        return { evaluator: 'code-eval', kind: 'CODE', score: 1.0 };
      }),
    });
    const llmEvaluator = createMockEvaluator({
      name: 'llm-eval',
      kind: 'LLM',
      evaluate: jest.fn().mockImplementation(async () => {
        callOrder.push('llm');
        return { evaluator: 'llm-eval', kind: 'LLM', score: 0.8 };
      }),
    });

    registry.register(codeEvaluator);
    registry.register(llmEvaluator);

    const runner = createEvaluationRunner(registry, logger);
    await runner.run({
      items: [{ input: { text: 'hello' }, output: 'world' }],
      evaluatorNames: ['code-eval', 'llm-eval'],
      connectorId: 'conn-1',
    });

    expect(callOrder).toEqual(['code', 'llm']);
  });

  it('skips LLM evaluators when required CODE evaluator fails', async () => {
    const codeEvaluator = createMockEvaluator({
      name: 'required-code',
      kind: 'CODE',
      evaluate: jest.fn().mockResolvedValue({
        evaluator: 'required-code',
        kind: 'CODE',
        score: 0,
        label: 'fail',
      }),
    });
    const llmEvaluator = createMockEvaluator({
      name: 'llm-eval',
      kind: 'LLM',
      evaluate: jest.fn(),
    });

    registry.register(codeEvaluator);
    registry.register(llmEvaluator);

    const runner = createEvaluationRunner(registry, logger);
    const result = await runner.run({
      items: [{ input: { text: 'hello' }, output: 'world' }],
      evaluatorNames: ['required-code', 'llm-eval'],
      connectorId: 'conn-1',
      requiredPass: ['required-code'],
    });

    expect(result.results[0].evaluatorResults).toHaveLength(2);
    expect(result.results[0].evaluatorResults[1].label).toBe('skipped');
    expect(llmEvaluator.evaluate).not.toHaveBeenCalled();
  });

  it('handles per-evaluator errors gracefully', async () => {
    const failingEvaluator = createMockEvaluator({
      name: 'failing',
      kind: 'CODE',
      evaluate: jest.fn().mockRejectedValue(new Error('Evaluation crashed')),
    });

    registry.register(failingEvaluator);

    const runner = createEvaluationRunner(registry, logger);
    const result = await runner.run({
      items: [{ input: { text: 'hello' }, output: 'world' }],
      evaluatorNames: ['failing'],
      connectorId: 'conn-1',
    });

    expect(result.results[0].evaluatorResults[0]).toEqual({
      evaluator: 'failing',
      kind: 'CODE',
      score: null,
      label: 'error',
      explanation: 'Evaluation crashed',
    });
  });

  it('processes multiple items', async () => {
    const evaluator = createMockEvaluator();
    registry.register(evaluator);

    const runner = createEvaluationRunner(registry, logger);
    const result = await runner.run({
      items: [
        { input: { text: 'a' }, output: 'x' },
        { input: { text: 'b' }, output: 'y' },
        { input: { text: 'c' }, output: 'z' },
      ],
      evaluatorNames: ['test-code'],
      connectorId: 'conn-1',
    });

    expect(result.results).toHaveLength(3);
    expect(result.results.map((r) => r.itemIndex)).toEqual([0, 1, 2]);
  });
});
