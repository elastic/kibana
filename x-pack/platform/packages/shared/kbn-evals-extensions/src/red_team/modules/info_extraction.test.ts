/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { infoExtractionModule } from './info_extraction';

describe('infoExtractionModule', () => {
  it('has correct name and category', () => {
    expect(infoExtractionModule.name).toBe('info-extraction');
    expect(infoExtractionModule.category).toBe('info-extraction');
  });

  it('generates examples with all required fields', () => {
    const examples = infoExtractionModule.generate();

    expect(examples.length).toBeGreaterThan(0);

    for (const ex of examples) {
      expect(ex.input).toBeDefined();
      expect(typeof ex.input.prompt).toBe('string');
      expect(ex.input.prompt.length).toBeGreaterThan(0);
      expect(ex.input.category).toBe('info-extraction');
      expect(typeof ex.input.technique).toBe('string');
      expect(typeof ex.input.description).toBe('string');
    }
  });

  it('generates at least one example per technique group', () => {
    const examples = infoExtractionModule.generate();
    const techniques = new Set(examples.map((e) => e.input.technique));

    expect(techniques.has('system-prompt-extraction')).toBe(true);
    expect(techniques.has('internal-data-probing')).toBe(true);
    expect(techniques.has('side-channel')).toBe(true);
  });

  it('filters by technique when specified', () => {
    const examples = infoExtractionModule.generate({
      techniques: ['system-prompt-extraction'],
    });

    expect(examples.length).toBeGreaterThan(0);
    for (const ex of examples) {
      expect(ex.input.technique).toBe('system-prompt-extraction');
    }
  });

  it('returns empty array for unknown technique', () => {
    const examples = infoExtractionModule.generate({ techniques: ['nonexistent'] });
    expect(examples).toEqual([]);
  });

  it('returns examples for multiple selected techniques', () => {
    const examples = infoExtractionModule.generate({
      techniques: ['system-prompt-extraction', 'side-channel'],
    });
    const techniques = new Set(examples.map((e) => e.input.technique));
    expect(techniques.has('system-prompt-extraction')).toBe(true);
    expect(techniques.has('side-channel')).toBe(true);
    expect(techniques.size).toBe(2);
  });
});
