/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  runConvergenceLoop,
  resolveEvaluatorNames,
  getDefaultCompositeConfig,
} from './convergence_loop';
import type { ProposedSkillDocument, ConvergenceConfig } from './types';
import { EvaluatorRegistry } from '../evaluation_engine';
import type { ServerEvaluator } from '../evaluation_engine';

const createSkill = (): ProposedSkillDocument => ({
  id: 'test-skill',
  name: 'Test Skill',
  description: 'Test skill description',
  markdown: '# Test\n\nContent',
  confidence: 0.8,
});

const createConfig = (overrides?: Partial<ConvergenceConfig>): ConvergenceConfig => ({
  threshold: 0.85,
  maxIterations: 5,
  convergenceDelta: 0.02,
  connectorId: 'test-connector',
  ...overrides,
});

const createMockEvaluator = (name: string, score: number): ServerEvaluator => ({
  name,
  kind: 'CODE',
  description: `Mock ${name}`,
  source: 'prebuilt',
  evaluate: jest.fn().mockResolvedValue({
    evaluator: name,
    kind: 'CODE',
    score,
    label: score > 0 ? 'pass' : 'fail',
    explanation: `Score is ${score}`,
  }),
});

describe('convergence_loop', () => {
  const logger = loggingSystemMock.createLogger();

  describe('resolveEvaluatorNames', () => {
    it('expands skill-preset to registered preset evaluators', () => {
      const registry = new EvaluatorRegistry(logger);
      registry.register(createMockEvaluator('skill-relevance', 1));
      registry.register(createMockEvaluator('skill-safety', 1));
      registry.register(createMockEvaluator('custom-eval', 1));

      const result = resolveEvaluatorNames(['skill-preset'], registry);

      expect(result).toContain('skill-relevance');
      expect(result).toContain('skill-safety');
      expect(result).not.toContain('custom-eval');
    });

    it('passes through non-preset names unchanged', () => {
      const registry = new EvaluatorRegistry(logger);
      registry.register(createMockEvaluator('my-custom', 1));

      const result = resolveEvaluatorNames(['my-custom'], registry);

      expect(result).toEqual(['my-custom']);
    });
  });

  describe('getDefaultCompositeConfig', () => {
    it('returns config with expected dimensions', () => {
      const config = getDefaultCompositeConfig();
      expect(config.dimensions).toHaveProperty('safety');
      expect(config.dimensions).toHaveProperty('accuracy');
      expect(config.weights).toHaveProperty('safety');
    });
  });

  describe('runConvergenceLoop', () => {
    it('converges when score passes threshold on first iteration', async () => {
      const registry = new EvaluatorRegistry(logger);
      registry.register(createMockEvaluator('skill-relevance', 0.9));
      registry.register(createMockEvaluator('skill-completeness', 0.9));
      registry.register(createMockEvaluator('skill-accuracy', 0.9));
      registry.register(createMockEvaluator('skill-specificity', 0.9));
      registry.register(createMockEvaluator('skill-safety', 0.9));

      const improveSkill = jest.fn();

      const result = await runConvergenceLoop(createSkill(), createConfig(), {
        evaluatorRegistry: registry,
        logger,
        improveSkill,
      });

      expect(result.converged).toBe(true);
      expect(result.reason).toBe('passed');
      expect(result.iterations).toHaveLength(1);
      expect(result.finalScore).toBeGreaterThanOrEqual(0.85);
      expect(improveSkill).not.toHaveBeenCalled();
    });

    it('converges after improvement iterations', async () => {
      const registry = new EvaluatorRegistry(logger);

      // All evaluators start low and improve after iteration 2
      let callCount = 0;
      const makeProgressive = (evalName: string): ServerEvaluator => ({
        name: evalName,
        kind: 'CODE',
        description: `Progressive ${evalName}`,
        source: 'prebuilt',
        evaluate: jest.fn().mockImplementation(() => {
          callCount++;
          // Each evaluator is called once per iteration (5 evaluators)
          // After 10 calls (2 full iterations), return high scores
          const score = callCount > 10 ? 0.95 : 0.5;
          return Promise.resolve({
            evaluator: evalName,
            kind: 'CODE',
            score,
            label: score > 0.85 ? 'pass' : 'fail',
          });
        }),
      });

      registry.register(makeProgressive('skill-relevance'));
      registry.register(makeProgressive('skill-completeness'));
      registry.register(makeProgressive('skill-accuracy'));
      registry.register(makeProgressive('skill-specificity'));
      registry.register(makeProgressive('skill-safety'));

      const improveSkill = jest
        .fn()
        .mockImplementation((s: ProposedSkillDocument) =>
          Promise.resolve({ ...s, markdown: `${s.markdown}\n\nImproved` })
        );

      const result = await runConvergenceLoop(createSkill(), createConfig(), {
        evaluatorRegistry: registry,
        logger,
        improveSkill,
      });

      expect(result.converged).toBe(true);
      expect(result.reason).toBe('passed');
      expect(result.iterations.length).toBeGreaterThan(1);
      expect(improveSkill).toHaveBeenCalled();
    });

    it('stops on plateau after 2 consecutive stalls', async () => {
      const registry = new EvaluatorRegistry(logger);
      registry.register(createMockEvaluator('skill-relevance', 0.7));
      registry.register(createMockEvaluator('skill-completeness', 0.7));
      registry.register(createMockEvaluator('skill-accuracy', 0.7));
      registry.register(createMockEvaluator('skill-specificity', 0.7));
      registry.register(createMockEvaluator('skill-safety', 0.7));

      const improveSkill = jest
        .fn()
        .mockImplementation((s: ProposedSkillDocument) => Promise.resolve(s));

      const result = await runConvergenceLoop(
        createSkill(),
        createConfig({ convergenceDelta: 0.05 }),
        {
          evaluatorRegistry: registry,
          logger,
          improveSkill,
        }
      );

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('plateau');
    });

    it('stops at max iterations', async () => {
      const registry = new EvaluatorRegistry(logger);

      let evalCall = 0;
      const slowlyImproving: ServerEvaluator = {
        name: 'skill-relevance',
        kind: 'CODE',
        description: 'Slowly improving',
        source: 'prebuilt',
        evaluate: jest.fn().mockImplementation(() => {
          evalCall++;
          return Promise.resolve({
            evaluator: 'skill-relevance',
            kind: 'CODE',
            score: 0.3 + evalCall * 0.1,
          });
        }),
      };
      registry.register(slowlyImproving);
      registry.register(createMockEvaluator('skill-completeness', 0.5));
      registry.register(createMockEvaluator('skill-accuracy', 0.5));
      registry.register(createMockEvaluator('skill-specificity', 0.5));
      registry.register(createMockEvaluator('skill-safety', 0.5));

      const improveSkill = jest
        .fn()
        .mockImplementation((s: ProposedSkillDocument) => Promise.resolve(s));

      const result = await runConvergenceLoop(createSkill(), createConfig({ maxIterations: 3 }), {
        evaluatorRegistry: registry,
        logger,
        improveSkill,
      });

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('max_iterations');
      expect(result.iterations).toHaveLength(3);
    });

    it('returns error reason when improvement fails', async () => {
      const registry = new EvaluatorRegistry(logger);
      registry.register(createMockEvaluator('skill-relevance', 0.5));
      registry.register(createMockEvaluator('skill-completeness', 0.5));
      registry.register(createMockEvaluator('skill-accuracy', 0.5));
      registry.register(createMockEvaluator('skill-specificity', 0.5));
      registry.register(createMockEvaluator('skill-safety', 0.5));

      const improveSkill = jest.fn().mockRejectedValue(new Error('LLM timeout'));

      const result = await runConvergenceLoop(createSkill(), createConfig(), {
        evaluatorRegistry: registry,
        logger,
        improveSkill,
      });

      expect(result.converged).toBe(false);
      expect(result.reason).toBe('error');
      expect(result.iterations).toHaveLength(1);
    });

    it('records iteration timestamps and improved flag', async () => {
      const registry = new EvaluatorRegistry(logger);
      registry.register(createMockEvaluator('skill-relevance', 0.5));
      registry.register(createMockEvaluator('skill-completeness', 0.5));
      registry.register(createMockEvaluator('skill-accuracy', 0.5));
      registry.register(createMockEvaluator('skill-specificity', 0.5));
      registry.register(createMockEvaluator('skill-safety', 0.5));

      const improveSkill = jest.fn().mockRejectedValue(new Error('fail'));

      const result = await runConvergenceLoop(createSkill(), createConfig({ maxIterations: 2 }), {
        evaluatorRegistry: registry,
        logger,
        improveSkill,
      });

      expect(result.iterations[0].iteration).toBe(1);
      expect(result.iterations[0].improved).toBe(false);
      expect(result.iterations[0].timestamp).toBeDefined();
    });
  });
});
