/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRedTeamDataset, ALL_MODULES, MODULES_BY_NAME } from './dataset';

describe('createRedTeamDataset', () => {
  it('returns a valid EvaluationDataset', () => {
    const dataset = createRedTeamDataset({ modules: ['prompt-injection'] });

    expect(dataset.name).toBe('red-team');
    expect(dataset.description).toContain('prompt-injection');
    expect(dataset.examples.length).toBeGreaterThan(0);
  });

  it('uses all modules when none specified', () => {
    const dataset = createRedTeamDataset();

    const categories = new Set(dataset.examples.map((e) => e.input.category));
    expect(categories.size).toBe(ALL_MODULES.length);
  });

  it('filters to specific modules', () => {
    const dataset = createRedTeamDataset({ modules: ['prompt-injection'] });

    for (const example of dataset.examples) {
      expect(example.input.category).toBe('prompt-injection');
    }
  });

  it('supports multiple module selection', () => {
    const dataset = createRedTeamDataset({
      modules: ['prompt-injection', 'jailbreaking'],
    });

    const categories = new Set(dataset.examples.map((e) => e.input.category));
    expect(categories.has('prompt-injection')).toBe(true);
    expect(categories.has('jailbreaking')).toBe(true);
    expect(categories.size).toBe(2);
  });

  it('ignores unknown module names gracefully', () => {
    const dataset = createRedTeamDataset({ modules: ['nonexistent'] });
    expect(dataset.examples).toHaveLength(0);
  });

  it('applies technique filtering from moduleConfig', () => {
    const dataset = createRedTeamDataset({
      modules: ['prompt-injection'],
      moduleConfig: { techniques: ['direct-override'] },
    });

    for (const example of dataset.examples) {
      expect(example.input.technique).toBe('direct-override');
    }
  });

  it('allows custom dataset name and description', () => {
    const dataset = createRedTeamDataset({
      name: 'custom-red-team',
      description: 'Custom adversarial dataset',
    });

    expect(dataset.name).toBe('custom-red-team');
    expect(dataset.description).toBe('Custom adversarial dataset');
  });

  it('examples have all required AttackExample fields', () => {
    const dataset = createRedTeamDataset({ modules: ['prompt-injection'] });

    for (const example of dataset.examples) {
      expect(typeof example.input.prompt).toBe('string');
      expect(example.input.prompt.length).toBeGreaterThan(0);
      expect(typeof example.input.category).toBe('string');
      expect(typeof example.input.technique).toBe('string');
      expect(typeof example.input.description).toBe('string');
    }
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
