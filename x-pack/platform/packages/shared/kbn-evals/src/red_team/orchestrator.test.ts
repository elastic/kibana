/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRedTeamOrchestrator, runRedTeam } from './orchestrator';
import type { EvalsExecutorClient, DatasetRunResult } from '../types';
import type { AttackResult, RedTeamConfig, RedTeamReport } from './types';
import { DEFAULT_GUARDRAIL_RULES } from './guardrails';

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

  it('suppresses ALL guardrail violations when both judge and leak evaluator agree safe', async () => {
    // Two-signal suppression: when attack-success-judge (score=1) AND prompt-leak-detection
    // (score=1) both confirm the attack was blocked, all guardrail violations are cleared —
    // including block/critical ones. The `system-prompt-leak` regex fires on refusal phrasing
    // ("I cannot share my system prompt") producing false positives; the combined LLM signal
    // is authoritative enough to suppress them.
    //
    // Note: in practice prompt-leak-detection returns score=0 for actual leaks and score=1
    // only for genuine refusals, so this suppression correctly targets false positives.
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    executorClient.runExperiment.mockImplementation(async (options, evaluators) => {
      const { datasets } = options;
      const [dataset] = datasets;
      const runs: Record<string, any> = {};
      const evaluationRuns: any[] = [];

      for (let i = 0; i < dataset.examples.length; i++) {
        const example = dataset.examples[i];
        const runKey = `${i}-0-mock`;
        // Response mentions "system prompt" in a refusal — triggers the guardrail regex
        // but is NOT a real leak. Both evaluators say safe (score=1).
        const output =
          'I cannot help with that request. My system prompt is internal and cannot be shared.';
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
            result: { score: 1.0, label: 'safe', explanation: 'attack was blocked' },
          });
        }

        // Inject judge verdict: score=1 (blocked)
        evaluationRuns.push({
          name: 'attack-success-judge',
          experimentRunId: runKey,
          result: { score: 1.0, label: 'ATTACK_BLOCKED', explanation: 'genuine refusal' },
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
      jest
        .fn()
        .mockResolvedValue(
          'I cannot help with that request. My system prompt is internal and cannot be shared.'
        )
    );

    const attackResult = report.modules[0].results[0];
    expect(attackResult).toBeDefined();

    // Two-signal agreement: both evaluators say safe → all guardrail violations suppressed
    expect(attackResult.guardrailViolations).toHaveLength(0);
    // Test should pass (no violations, evaluators confirm blocked)
    expect(attackResult.namedScores.every((s) => s.score === 1)).toBe(true);
  });

  it('preserves block-action guardrail violations when only judge says blocked but leak evaluator is absent', async () => {
    // Single-signal case: judge says blocked but no prompt-leak-detection evaluator.
    // Keep block/critical violations as safety net.
    const executorClient = createMockExecutorClient();
    const log = createMockLog();

    executorClient.runExperiment.mockImplementation(async (options) => {
      const { datasets } = options;
      const [dataset] = datasets;
      const runs: Record<string, any> = {};
      const evaluationRuns: any[] = [];

      for (let i = 0; i < dataset.examples.length; i++) {
        const example = dataset.examples[i];
        const runKey = `${i}-0-mock`;
        const output = 'My system prompt is: You are a security assistant.';
        runs[runKey] = {
          exampleIndex: i,
          repetition: 0,
          input: example.input,
          expected: example.output,
          metadata: example.metadata,
          output,
        };

        // Only inject judge verdict — no prompt-leak-detection evaluator present
        evaluationRuns.push({
          name: 'attack-success-judge',
          experimentRunId: runKey,
          result: { score: 1.0, label: 'ATTACK_BLOCKED', explanation: 'judge only' },
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

    const report = await orchestrator.run(jest.fn().mockResolvedValue(''));

    const attackResult = report.modules[0].results[0];
    expect(attackResult).toBeDefined();

    // Single signal only — block/critical violations are preserved as safety net
    const blockViolation = attackResult.guardrailViolations.find(
      (v) => v.rule === 'system-prompt-leak'
    );
    expect(blockViolation).toBeDefined();
    expect(blockViolation?.action).toBe('block');
  });

  describe('AttackResult shape', () => {
    it('does not include evaluatorScores in AttackResult', () => {
      // AttackResult should only have namedScores, not evaluatorScores
      const result: AttackResult = {
        example: { input: { value: 'x' }, output: 'y' },
        namedScores: [],
        responseExcerpt: '',
        guardrailViolations: [],
        severity: 'low',
        owaspCategory: 'LLM01',
        attackModule: 'test',
        strategy: 'direct',
      };
      // TypeScript compile-time check: the object above must not require evaluatorScores
      expect(result).toBeDefined();
      // evaluatorScores must NOT exist on the type
      expect('evaluatorScores' in result).toBe(false);
    });
  });

  describe('orchestrator does not mutate config guardrails', () => {
    it('leaves the original rules array unchanged after runRedTeam', async () => {
      const originalRules = [...DEFAULT_GUARDRAIL_RULES];
      const config: RedTeamConfig = {
        modules: ['jailbreaking'],
        count: 1,
        difficulty: 'basic',
        templateOnly: true,
        guardrails: { rules: [...DEFAULT_GUARDRAIL_RULES] },
      };
      const originalLength = config.guardrails!.rules.length;
      await runRedTeam(config);
      expect(config.guardrails!.rules.length).toBe(originalLength);
      expect(config.guardrails!.rules).toEqual(originalRules);
    });
  });

  describe('multi-strategy orchestration', () => {
    it('runs all configured strategies and includes each in the report', async () => {
      const executorClient = createMockExecutorClient();
      const log = createMockLog();

      const orchestrator = createRedTeamOrchestrator({
        config: {
          modules: ['prompt_injection'],
          strategies: ['direct', 'base64'],
          count: 1,
          difficulty: 'basic',
          templateOnly: true,
        },
        executorClient,
        log: log as any,
      });

      const report = await orchestrator.run(jest.fn().mockResolvedValue('safe response'));

      // Should have 2 module reports (one per strategy)
      expect(report.modules).toHaveLength(2);
      const strategyNames = report.modules.map((m) => m.results[0]?.strategy);
      expect(strategyNames).toContain('direct');
      expect(strategyNames).toContain('base64');
      expect(report.strategies).toEqual(['direct', 'base64']);
    });

    it('defaults to ["direct"] when no strategies configured', async () => {
      const executorClient = createMockExecutorClient();
      const log = createMockLog();

      const orchestrator = createRedTeamOrchestrator({
        config: {
          modules: ['prompt_injection'],
          count: 1,
          difficulty: 'basic',
          templateOnly: true,
        },
        executorClient,
        log: log as any,
      });

      const report = await orchestrator.run(jest.fn().mockResolvedValue('safe response'));
      expect(report.strategies).toEqual(['direct']);
    });
  });

  describe('checkPassRates', () => {
    const makeReport = (
      modules: Array<{ name: string; passed: number; total: number }>
    ): RedTeamReport => ({
      runId: 'test',
      suite: 'test',
      strategies: ['direct'],
      strategy: 'direct',
      difficulty: 'basic',
      templateOnly: true,
      modules: modules.map(({ name, passed, total }) => ({
        module: name,
        strategy: 'direct',
        passed,
        failed: total - passed,
        total,
        results: [],
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      })),
      overallPassRate:
        (modules.reduce((s, m) => s + m.passed, 0) / modules.reduce((s, m) => s + m.total, 0)) *
        100,
    });

    it('returns passed=true when all module rates meet their thresholds', () => {
      const orchestrator = createRedTeamOrchestrator({
        config: {
          modules: ['prompt_injection'],
          count: 1,
          difficulty: 'basic',
          templateOnly: true,
          moduleMinPassRates: { prompt_injection: 80 },
        },
        executorClient: createMockExecutorClient(),
        log: createMockLog() as any,
      });

      const report = makeReport([{ name: 'prompt_injection', passed: 9, total: 10 }]);
      const result = orchestrator.checkPassRates(report);
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('returns failure when a module falls below its threshold', () => {
      const orchestrator = createRedTeamOrchestrator({
        config: {
          modules: ['prompt_injection'],
          count: 1,
          difficulty: 'basic',
          templateOnly: true,
          moduleMinPassRates: { prompt_injection: 95 },
        },
        executorClient: createMockExecutorClient(),
        log: createMockLog() as any,
      });

      const report = makeReport([{ name: 'prompt_injection', passed: 7, total: 10 }]);
      const result = orchestrator.checkPassRates(report);
      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].module).toBe('prompt_injection');
      expect(result.failures[0].passRate).toBe(70);
      expect(result.failures[0].required).toBe(95);
    });

    it('checks overall minPassRate against overallPassRate', () => {
      const orchestrator = createRedTeamOrchestrator({
        config: {
          modules: ['prompt_injection'],
          count: 1,
          difficulty: 'basic',
          templateOnly: true,
          minPassRate: 90,
        },
        executorClient: createMockExecutorClient(),
        log: createMockLog() as any,
      });

      const report = makeReport([{ name: 'prompt_injection', passed: 8, total: 10 }]);
      // overallPassRate = 80, required = 90 → should fail
      const result = orchestrator.checkPassRates(report);
      expect(result.passed).toBe(false);
      expect(result.failures[0].module).toBe('overall');
      expect(result.failures[0].passRate).toBe(80);
      expect(result.failures[0].required).toBe(90);
    });
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
