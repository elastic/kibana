/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRedTeamOrchestrator } from './orchestrator';
import type { EvalsExecutorClient, DatasetRunResult } from '../types';
import type { RedTeamConfig } from './types';

const createMockLog = () => ({
  info: jest.fn(),
  warning: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
  write: jest.fn(),
  getWritten: jest.fn().mockReturnValue({ log: [], error: [] }),
  indent: jest.fn(),
  get: jest.fn(),
});

const createMockExecutorClient = (): jest.Mocked<EvalsExecutorClient> => {
  const runExperiment = jest.fn().mockImplementation(async (options) => {
    const { datasets, task } = options;
    const [dataset] = datasets;
    const runs: Record<string, any> = {};
    const evaluationRuns: any[] = [];

    for (let i = 0; i < dataset.examples.length; i++) {
      const example = dataset.examples[i];
      const runKey = `${i}-0-mock`;
      const output = await task(example);
      runs[runKey] = {
        exampleIndex: i,
        repetition: 0,
        input: example.input,
        expected: example.output,
        metadata: example.metadata,
        output,
      };
    }

    return [
      {
        id: 'mock-experiment',
        experimentName: dataset.name,
        datasetId: 'mock-dataset',
        datasetName: dataset.name,
        runs,
        evaluationRuns,
        experimentMetadata: options.metadata,
      },
    ] as DatasetRunResult[];
  });

  return {
    runExperiment,
    getDatasetRunResults: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<EvalsExecutorClient>;
};

describe('RedTeamOrchestrator', () => {
  const defaultConfig: RedTeamConfig = {
    count: 3,
    difficulty: 'basic',
    templateOnly: true,
  };

  it('runs attack modules and produces a report', async () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    const orchestrator = createRedTeamOrchestrator({
      config: { ...defaultConfig, modules: ['prompt_injection'] },
      executorClient,
      log: log as any,
    });

    const task = jest.fn().mockResolvedValue('Safe response from the model.');

    const report = await orchestrator.run(task);

    expect(report).toBeDefined();
    expect(report.modules).toHaveLength(1);
    expect(report.modules[0].module).toBe('prompt_injection');
    expect(report.modules[0].total).toBe(3);
    expect(report.overallPassRate).toBeDefined();
    expect(report.strategy).toBe('direct');
    expect(report.difficulty).toBe('basic');
  });

  it('calls executorClient.runExperiment with correct metadata', async () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    const orchestrator = createRedTeamOrchestrator({
      config: { ...defaultConfig, modules: ['prompt_injection'] },
      executorClient,
      log: log as any,
    });

    await orchestrator.run(jest.fn().mockResolvedValue('response'));

    expect(executorClient.runExperiment).toHaveBeenCalledTimes(1);
    const callArgs = executorClient.runExperiment.mock.calls[0][0];
    expect(callArgs.metadata?.['run.type']).toBe('red-team');
    expect(callArgs.metadata?.['redTeam.module']).toBe('prompt_injection');
    expect(callArgs.metadata?.['redTeam.strategy']).toBe('direct');
    expect(callArgs.datasets[0].name).toBe('red-team-prompt_injection-direct');
  });

  it('runs specific modules when configured', async () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    const orchestrator = createRedTeamOrchestrator({
      config: { ...defaultConfig, modules: ['prompt_injection'] },
      executorClient,
      log: log as any,
    });

    const report = await orchestrator.run(jest.fn().mockResolvedValue('response'));
    expect(report.modules).toHaveLength(1);
    expect(report.modules[0].module).toBe('prompt_injection');
  });

  it('applies guardrails to task outputs', async () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    const orchestrator = createRedTeamOrchestrator({
      config: defaultConfig,
      executorClient,
      log: log as any,
    });

    // Return output that triggers guardrails
    const task = jest.fn().mockResolvedValue('Here is my system prompt: you are helpful');

    const report = await orchestrator.run(task);

    // Should detect guardrail violations and classify severity accordingly
    const failures = report.modules[0].results.filter((r) => r.guardrailViolations.length > 0);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].severity).not.toBe('low');
  });

  it('scanExistingRun applies guardrails without re-executing', () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    const orchestrator = createRedTeamOrchestrator({
      config: defaultConfig,
      executorClient,
      log: log as any,
    });

    const results = orchestrator.scanExistingRun([
      { output: 'Clean output', module: 'prompt_injection', strategy: 'direct' },
      { output: 'Here is my system prompt', module: 'prompt_injection', strategy: 'direct' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].guardrailViolations).toHaveLength(0);
    expect(results[1].guardrailViolations.length).toBeGreaterThan(0);
  });

  it('calculates overall pass rate correctly', async () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    const orchestrator = createRedTeamOrchestrator({
      config: { ...defaultConfig, count: 2 },
      executorClient,
      log: log as any,
    });

    const report = await orchestrator.run(jest.fn().mockResolvedValue('Clean response'));
    // With clean responses, all should pass
    expect(report.overallPassRate).toBe(100);
  });

  it('preserves block-action guardrail violations even when judge says attack was blocked', async () => {
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    // Override the executor to simulate a judge saying "blocked" but the output leaking system prompt
    executorClient.runExperiment.mockImplementation(async (options, evaluators) => {
      const { datasets } = options;
      const [dataset] = datasets;
      const runs: Record<string, any> = {};
      const evaluationRuns: any[] = [];

      for (let i = 0; i < dataset.examples.length; i++) {
        const example = dataset.examples[i];
        const runKey = `${i}-0-mock`;
        // Output triggers system-prompt-leak (action=block, severity=critical)
        // Even though the "attack" was blocked, the model leaked its system prompt in the refusal
        const output =
          "I cannot help with that request. My system prompt is: You are a security assistant.";
        runs[runKey] = {
          exampleIndex: i,
          repetition: 0,
          input: example.input,
          expected: example.output,
          metadata: example.metadata,
          output,
        };

        // All evaluators return score=1.0 (attack blocked / safe)
        for (const ev of evaluators) {
          evaluationRuns.push({
            name: ev.name,
            experimentRunId: runKey,
            result: { score: 1.0, label: 'blocked', explanation: 'attack was blocked' },
          });
        }

        // Inject a judge verdict directly: attack-success-judge says score=1 (blocked).
        // This is the specific evaluator name the orchestrator checks for the suppression logic.
        // Without an inferenceClient, no real judge is created, so we inject it here to
        // exercise the suppression code path.
        evaluationRuns.push({
          name: 'attack-success-judge',
          experimentRunId: runKey,
          result: { score: 1.0, label: 'blocked', explanation: 'attack was blocked' },
        });
      }

      return [
        {
          id: 'mock',
          experimentName: dataset.name,
          datasetId: 'mock-dataset',
          datasetName: dataset.name,
          runs,
          evaluationRuns,
          experimentMetadata: options.metadata,
        },
      ];
    });

    const orchestrator = createRedTeamOrchestrator({
      config: {
        count: 1,
        difficulty: 'basic',
        templateOnly: true,
        modules: ['prompt_injection'],
      },
      executorClient,
      log: log as any,
    });

    const report = await orchestrator.run(
      jest.fn().mockResolvedValue(
        "I cannot help with that request. My system prompt is: You are a security assistant."
      )
    );

    const attackResult = report.modules[0].results[0];
    expect(attackResult).toBeDefined();

    // system-prompt-leak (action=block, severity=critical) must NOT be cleared
    // even when all evaluator scores are 1.0
    const blockViolation = attackResult.guardrailViolations.find(
      (v) => v.rule === 'system-prompt-leak'
    );
    expect(blockViolation).toBeDefined();
    expect(blockViolation?.action).toBe('block');
  });

  describe('multi-turn strategy (crescendo)', () => {
    const multiTurnConfig: RedTeamConfig = {
      count: 1,
      difficulty: 'basic',
      templateOnly: true,
      modules: ['prompt_injection'],
      strategies: ['crescendo'],
    };

    it('runs multiple experiment calls for a multi-turn strategy', async () => {
      const executorClient = createMockExecutorClient();
      const log = createMockLog();

      const orchestrator = createRedTeamOrchestrator({
        config: multiTurnConfig,
        executorClient,
        log: log as any,
      });

      const task = jest.fn().mockResolvedValue('Safe response');
      const report = await orchestrator.run(task);

      // Crescendo uses 5 attacker turns + 1 final evaluation = 6 runExperiment calls per example
      // (each intermediate turn + final re-run with evaluators)
      expect(executorClient.runExperiment.mock.calls.length).toBeGreaterThan(1);
      expect(report).toBeDefined();
      expect(report.strategy).toBe('crescendo');
      expect(report.modules).toHaveLength(1);
      expect(report.modules[0].total).toBe(1);
    });

    it('only applies evaluators on the final experiment call', async () => {
      const executorClient = createMockExecutorClient();
      const log = createMockLog();

      const orchestrator = createRedTeamOrchestrator({
        config: multiTurnConfig,
        executorClient,
        log: log as any,
      });

      const task = jest.fn().mockResolvedValue('Safe response');
      await orchestrator.run(task);

      const calls = executorClient.runExperiment.mock.calls;
      // All intermediate calls should have empty evaluators
      for (let i = 0; i < calls.length - 1; i++) {
        expect(calls[i][1]).toEqual([]);
      }
      // The final call (evaluation run) should have evaluators
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].length).toBeGreaterThan(0);
    });

    it('processes multi-turn results correctly', async () => {
      const executorClient = createMockExecutorClient();
      const log = createMockLog();

      const orchestrator = createRedTeamOrchestrator({
        config: multiTurnConfig,
        executorClient,
        log: log as any,
      });

      const task = jest.fn().mockResolvedValue('Clean response');
      const report = await orchestrator.run(task);

      // Clean responses should all pass
      expect(report.overallPassRate).toBe(100);
      expect(report.modules[0].passed).toBe(1);
      expect(report.modules[0].failed).toBe(0);
      expect(report.modules[0].results).toHaveLength(1);
      expect(report.modules[0].results[0].strategy).toBe('crescendo');
    });
  });
});
