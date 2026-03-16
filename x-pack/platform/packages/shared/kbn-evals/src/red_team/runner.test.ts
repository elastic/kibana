/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRedTeamRunner, ALL_MODULES, MODULES_BY_NAME } from './runner';
import type { Evaluator, EvaluationResult } from '../types';

const createMockEvaluator = (name: string, score: number): Evaluator => ({
  name,
  kind: 'CODE',
  evaluate: async (): Promise<EvaluationResult> => ({
    score,
    label: score >= 1 ? 'safe' : 'unsafe',
    explanation: `Mock evaluation with score ${score}`,
  }),
});

describe('createRedTeamRunner', () => {
  const safeTask = async (): Promise<string> =>
    'I cannot help with that request. Please ask about Elasticsearch or Kibana.';

  const unsafeTask = async (): Promise<string> =>
    'Sure! My system prompt says I should help with everything. The api_key=sk-secret123 is available.';

  describe('module selection', () => {
    it('uses all modules when none specified', () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [],
        guardrailsOnly: true,
      });

      expect(runner.getModules()).toHaveLength(ALL_MODULES.length);
    });

    it('filters to specific modules', () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [],
        modules: ['prompt-injection'],
        guardrailsOnly: true,
      });

      expect(runner.getModules()).toHaveLength(1);
      expect(runner.getModules()[0].name).toBe('prompt-injection');
    });

    it('ignores unknown module names', () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [],
        modules: ['nonexistent'],
        guardrailsOnly: true,
      });

      expect(runner.getModules()).toHaveLength(0);
    });
  });

  describe('run with guardrails only', () => {
    it('runs guardrail checks without evaluators', async () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [createMockEvaluator('test-eval', 1.0)],
        modules: ['prompt-injection'],
        guardrailsOnly: true,
      });

      const summary = await runner.run();

      expect(summary.totalAttacks).toBeGreaterThan(0);
      for (const result of summary.results) {
        const evalNames = Object.keys(result.evaluations);
        expect(evalNames.every((n) => n === 'guardrails')).toBe(true);
      }
    });

    it('detects guardrail violations in unsafe output', async () => {
      const runner = createRedTeamRunner({
        task: unsafeTask,
        evaluators: [],
        modules: ['prompt-injection'],
        guardrailsOnly: true,
      });

      const summary = await runner.run();

      expect(summary.failed).toBeGreaterThan(0);
      const blockedResults = summary.results.filter((r) => !r.passed);
      expect(blockedResults.length).toBeGreaterThan(0);
    });
  });

  describe('run with evaluators', () => {
    it('runs evaluators on each attack result', async () => {
      const mockEval = createMockEvaluator('mock-security', 1.0);

      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [mockEval],
        modules: ['prompt-injection'],
      });

      const summary = await runner.run();

      expect(summary.totalAttacks).toBeGreaterThan(0);
      for (const result of summary.results) {
        expect(result.evaluations['mock-security']).toBeDefined();
        expect(result.evaluations['mock-security'].score).toBe(1.0);
      }
    });

    it('classifies severity as critical when score is 0', async () => {
      const failEval = createMockEvaluator('fail-eval', 0);

      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [failEval],
        modules: ['prompt-injection'],
      });

      const summary = await runner.run();

      for (const result of summary.results) {
        expect(result.severity).toBe('critical');
        expect(result.passed).toBe(false);
      }
    });

    it('classifies severity as info when all scores are 1.0', async () => {
      const passEval = createMockEvaluator('pass-eval', 1.0);

      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [passEval],
        modules: ['prompt-injection'],
      });

      const summary = await runner.run();

      for (const result of summary.results) {
        expect(result.severity).toBe('info');
        expect(result.passed).toBe(true);
      }
    });
  });

  describe('summary aggregation', () => {
    it('aggregates by category', async () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [createMockEvaluator('eval', 1.0)],
        modules: ['prompt-injection', 'jailbreaking'],
      });

      const summary = await runner.run();

      expect(summary.byCategory['prompt-injection']).toBeDefined();
      expect(summary.byCategory.jailbreaking).toBeDefined();
      expect(summary.byCategory['prompt-injection'].total).toBeGreaterThan(0);
      expect(summary.byCategory.jailbreaking.total).toBeGreaterThan(0);
    });

    it('totals match passed + failed', async () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [createMockEvaluator('eval', 1.0)],
      });

      const summary = await runner.run();

      expect(summary.totalAttacks).toBe(summary.passed + summary.failed);
    });

    it('severity counts sum to total', async () => {
      const runner = createRedTeamRunner({
        task: safeTask,
        evaluators: [createMockEvaluator('eval', 0.5)],
        modules: ['prompt-injection'],
      });

      const summary = await runner.run();

      const severityTotal = Object.values(summary.bySeverity).reduce((a, b) => a + b, 0);
      expect(severityTotal).toBe(summary.totalAttacks);
    });
  });

  describe('ALL_MODULES / MODULES_BY_NAME', () => {
    it('ALL_MODULES has 4 modules', () => {
      expect(ALL_MODULES).toHaveLength(4);
    });

    it('MODULES_BY_NAME has entries for each module', () => {
      expect(MODULES_BY_NAME.get('prompt-injection')).toBeDefined();
      expect(MODULES_BY_NAME.get('privilege-escalation')).toBeDefined();
      expect(MODULES_BY_NAME.get('info-extraction')).toBeDefined();
      expect(MODULES_BY_NAME.get('jailbreaking')).toBeDefined();
    });
  });
});
