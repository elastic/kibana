/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promptInjectionModule } from './prompt_injection';

describe('promptInjectionModule', () => {
  it('has correct name and category', () => {
    expect(promptInjectionModule.name).toBe('prompt-injection');
    expect(promptInjectionModule.category).toBe('prompt-injection');
  });

  it('generates examples with all required fields', () => {
    const examples = promptInjectionModule.generate();

    expect(examples.length).toBeGreaterThan(0);

    for (const ex of examples) {
      expect(ex.input).toBeDefined();
      expect(typeof ex.input.prompt).toBe('string');
      expect(ex.input.prompt.length).toBeGreaterThan(0);
      expect(ex.input.category).toBe('prompt-injection');
      expect(typeof ex.input.technique).toBe('string');
      expect(typeof ex.input.description).toBe('string');
    }
  });

  it('generates at least one example per technique group', () => {
    const examples = promptInjectionModule.generate();
    const techniques = new Set(examples.map((e) => e.input.technique));

    expect(techniques.has('direct-override')).toBe(true);
    expect(techniques.has('data-channel')).toBe(true);
    expect(techniques.has('social-engineering')).toBe(true);
  });

  it('filters by technique when specified', () => {
    const examples = promptInjectionModule.generate({ techniques: ['direct-override'] });

    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      expect(ex.input.technique).toBe('direct-override');
    }
  });

  it('returns empty array for unknown technique', () => {
    const examples = promptInjectionModule.generate({ techniques: ['nonexistent'] });
    expect(examples).toEqual([]);
  });

  it('returns examples for multiple selected techniques', () => {
    const examples = promptInjectionModule.generate({
      techniques: ['direct-override', 'social-engineering'],
    });
    const techniques = new Set(examples.map((e) => e.input.technique));
    expect(techniques.has('direct-override')).toBe(true);
    expect(techniques.has('social-engineering')).toBe(true);
    expect(techniques.size).toBe(2);
  });
});
