/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRedTeamDataset,
  createGuardrailsEvaluator,
  createGuardrailsEngine,
  getRedTeamEvaluators,
  DEFAULT_GUARDRAIL_RULES,
  promptInjectionModule,
  privilegeEscalationModule,
  infoExtractionModule,
  jailbreakingModule,
  ALL_MODULES,
} from '..';

describe('@kbn/evals-extensions', () => {
  describe('package structure', () => {
    it('should be importable without errors', async () => {
      const mod = await import('..');
      expect(mod).toBeDefined();
    });
  });

  describe('red-team exports', () => {
    it('exports createRedTeamDataset', () => {
      expect(typeof createRedTeamDataset).toBe('function');
    });

    it('exports createGuardrailsEvaluator', () => {
      expect(typeof createGuardrailsEvaluator).toBe('function');
    });

    it('exports createGuardrailsEngine', () => {
      expect(typeof createGuardrailsEngine).toBe('function');
    });

    it('exports getRedTeamEvaluators', () => {
      expect(typeof getRedTeamEvaluators).toBe('function');
    });

    it('exports DEFAULT_GUARDRAIL_RULES', () => {
      expect(Array.isArray(DEFAULT_GUARDRAIL_RULES)).toBe(true);
      expect(DEFAULT_GUARDRAIL_RULES.length).toBeGreaterThan(0);
    });

    it('exports all attack modules', () => {
      expect(promptInjectionModule.name).toBe('prompt-injection');
      expect(privilegeEscalationModule.name).toBe('privilege-escalation');
      expect(infoExtractionModule.name).toBe('info-extraction');
      expect(jailbreakingModule.name).toBe('jailbreaking');
    });

    it('exports ALL_MODULES with 4 modules', () => {
      expect(ALL_MODULES).toHaveLength(4);
    });
  });

  describe('framework integration', () => {
    it('createRedTeamDataset returns EvaluationDataset shape', () => {
      const dataset = createRedTeamDataset({ modules: ['prompt-injection'] });

      expect(dataset).toHaveProperty('name');
      expect(dataset).toHaveProperty('description');
      expect(dataset).toHaveProperty('examples');
      expect(Array.isArray(dataset.examples)).toBe(true);
    });

    it('createGuardrailsEvaluator returns Evaluator shape', () => {
      const evaluator = createGuardrailsEvaluator();

      expect(evaluator).toHaveProperty('name', 'guardrails');
      expect(evaluator).toHaveProperty('kind', 'CODE');
      expect(typeof evaluator.evaluate).toBe('function');
    });

    it('getRedTeamEvaluators returns array of Evaluators', () => {
      const evaluators = getRedTeamEvaluators();

      expect(Array.isArray(evaluators)).toBe(true);
      for (const evaluator of evaluators) {
        expect(evaluator).toHaveProperty('name');
        expect(evaluator).toHaveProperty('kind');
        expect(typeof evaluator.evaluate).toBe('function');
      }
    });
  });

  describe('dependency isolation', () => {
    it('should not create circular dependencies with @kbn/evals', async () => {
      const evalsExtensions = await import('..');
      const kbnEvals = await import('@kbn/evals');

      expect(evalsExtensions).toBeDefined();
      expect(kbnEvals).toBeDefined();
    });
  });
});
