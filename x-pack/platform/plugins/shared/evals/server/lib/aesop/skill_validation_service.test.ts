/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SkillValidationService } from './skill_validation_service';
import { EvaluatorRegistry } from '../evaluation_engine';
import type { ServerEvaluator } from '../evaluation_engine';
import type { ProposedSkillDocument, ConvergenceConfig } from './types';

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
    explanation: `Score: ${score}`,
  }),
});

describe('SkillValidationService', () => {
  const logger = loggingSystemMock.createLogger();

  const setupRegistry = (score: number = 0.9) => {
    const registry = new EvaluatorRegistry(logger);
    registry.register(createMockEvaluator('skill-relevance', score));
    registry.register(createMockEvaluator('skill-completeness', score));
    registry.register(createMockEvaluator('skill-accuracy', score));
    registry.register(createMockEvaluator('skill-specificity', score));
    registry.register(createMockEvaluator('skill-safety', score));
    return registry;
  };

  describe('single validation (no convergence)', () => {
    it('returns passed status when score exceeds threshold', async () => {
      const registry = setupRegistry(0.9);
      const service = new SkillValidationService(registry, logger);

      const result = await service.validateSkill(createSkill(), createConfig());

      expect(result.status).toBe('passed');
      expect(result.final_score).toBeGreaterThanOrEqual(0.85);
      expect(result.composite_grade).toBeDefined();
      expect(result.evaluator_results).toBeDefined();
      expect(result.evaluator_results!.length).toBeGreaterThan(0);
      expect(result.gate_result).toBeDefined();
      expect(result.gate_result!.passed).toBe(true);
    });

    it('returns failed status when score is below threshold', async () => {
      const registry = setupRegistry(0.3);
      const service = new SkillValidationService(registry, logger);

      const result = await service.validateSkill(createSkill(), createConfig());

      expect(result.status).toBe('failed');
      expect(result.final_score).toBeLessThan(0.85);
      expect(result.gate_result!.passed).toBe(false);
      expect(result.gate_result!.failed_gates.length).toBeGreaterThan(0);
    });

    it('records duration and timestamps', async () => {
      const registry = setupRegistry(0.9);
      const service = new SkillValidationService(registry, logger);

      const result = await service.validateSkill(createSkill(), createConfig());

      expect(result.started_at).toBeDefined();
      expect(result.completed_at).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.connector_id).toBe('test-connector');
    });

    it('does not include convergence fields', async () => {
      const registry = setupRegistry(0.9);
      const service = new SkillValidationService(registry, logger);

      const result = await service.validateSkill(createSkill(), createConfig());

      expect(result.iterations).toBeUndefined();
      expect(result.convergence).toBeUndefined();
    });
  });

  describe('convergence validation', () => {
    it('throws when autoConverge is true but no inferenceClient', async () => {
      const registry = setupRegistry(0.9);
      const service = new SkillValidationService(registry, logger);

      await expect(
        service.validateSkill(createSkill(), createConfig(), { autoConverge: true })
      ).rejects.toThrow('autoConverge requires an inferenceClient');
    });

    it('returns passed with convergence data when score passes', async () => {
      const registry = setupRegistry(0.95);
      const service = new SkillValidationService(registry, logger);

      const inferenceClient = {
        chatComplete: jest.fn().mockResolvedValue({
          content: '{"name": "Improved", "description": "Better", "markdown": "# Better"}',
        }),
      };

      const result = await service.validateSkill(createSkill(), createConfig(), {
        autoConverge: true,
        inferenceClient,
      });

      expect(result.status).toBe('passed');
      expect(result.convergence).toBeDefined();
      expect(result.convergence!.converged).toBe(true);
      expect(result.convergence!.reason).toBe('passed');
      expect(result.iterations).toBeDefined();
      expect(result.iterations!.length).toBeGreaterThan(0);
    });

    it('returns failed with convergence data when max iterations reached', async () => {
      const registry = setupRegistry(0.5);
      const service = new SkillValidationService(registry, logger);

      const inferenceClient = {
        chatComplete: jest.fn().mockResolvedValue({
          content: '{"name": "Same", "description": "Same", "markdown": "# Same"}',
        }),
      };

      const result = await service.validateSkill(
        createSkill(),
        createConfig({ maxIterations: 2, convergenceDelta: 0.001 }),
        { autoConverge: true, inferenceClient }
      );

      expect(result.status).toBe('failed');
      expect(result.convergence).toBeDefined();
      expect(result.convergence!.converged).toBe(false);
    });
  });
});
