/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jailbreakingModule } from './jailbreaking';

describe('jailbreakingModule', () => {
  it('has correct name and category', () => {
    expect(jailbreakingModule.name).toBe('jailbreaking');
    expect(jailbreakingModule.category).toBe('jailbreaking');
  });

  it('generates examples with all required fields', () => {
    const examples = jailbreakingModule.generate();

    expect(examples.length).toBeGreaterThan(0);

    for (const ex of examples) {
      expect(ex.input).toBeDefined();
      expect(typeof ex.input.prompt).toBe('string');
      expect(ex.input.prompt.length).toBeGreaterThan(0);
      expect(ex.input.category).toBe('jailbreaking');
      expect(typeof ex.input.technique).toBe('string');
      expect(typeof ex.input.description).toBe('string');
    }
  });

  it('generates at least one example per technique group', () => {
    const examples = jailbreakingModule.generate();
    const techniques = new Set(examples.map((e) => e.input.technique));

    expect(techniques.has('persona-override')).toBe(true);
    expect(techniques.has('encoding-bypass')).toBe(true);
    expect(techniques.has('hypothetical-framing')).toBe(true);
    expect(techniques.has('multi-step')).toBe(true);
  });

  it('filters by technique when specified', () => {
    const examples = jailbreakingModule.generate({ techniques: ['persona-override'] });

    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      expect(ex.input.technique).toBe('persona-override');
    }
  });

  it('returns empty array for unknown technique', () => {
    const examples = jailbreakingModule.generate({ techniques: ['nonexistent'] });
    expect(examples).toEqual([]);
  });
});
