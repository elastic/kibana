/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRedTeamRunner,
  createGuardrailsEngine,
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
    it('exports createRedTeamRunner', () => {
      expect(typeof createRedTeamRunner).toBe('function');
    });

    it('exports createGuardrailsEngine', () => {
      expect(typeof createGuardrailsEngine).toBe('function');
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

  describe('dependency isolation', () => {
    it('should not create circular dependencies with @kbn/evals', async () => {
      const evalsExtensions = await import('..');
      const kbnEvals = await import('@kbn/evals');

      expect(evalsExtensions).toBeDefined();
      expect(kbnEvals).toBeDefined();
    });
  });
});
