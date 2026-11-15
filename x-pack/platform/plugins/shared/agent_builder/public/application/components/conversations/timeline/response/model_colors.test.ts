/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getModelColor } from './model_colors';

const palette = ['#c0', '#c1', '#c2', '#c3', '#c4'];

describe('getModelColor', () => {
  it('gives a model the same colour every time', () => {
    expect(getModelColor('claude-opus', palette)).toBe(getModelColor('claude-opus', palette));
  });

  // Pins the result of the hash: changing it would change the colour of every model for every user.
  it('keeps the colour of known models', () => {
    expect(getModelColor('claude-opus', palette)).toBe('#c0');
    expect(getModelColor('gpt-5', palette)).toBe('#c1');
    expect(getModelColor('google-gemini-3.5-flash-lite', palette)).toBe('#c2');
    expect(getModelColor('gemini-flash', palette)).toBe('#c3');
    expect(getModelColor('anthropic-claude-4.5-haiku', palette)).toBe('#c4');
  });

  it('always returns a colour of the palette', () => {
    for (const key of ['a', 'claude-opus', 'anthropic-claude-4.5-haiku', '.google-gemini-flash']) {
      expect(palette).toContain(getModelColor(key, palette));
    }
  });

  it('spreads the models over the palette', () => {
    const keys = Array.from({ length: 40 }, (_, i) => `model-${i}`);

    const used = new Set(keys.map((key) => getModelColor(key, palette)));

    expect(used.size).toBe(palette.length);
  });

  it('returns no colour for an empty palette', () => {
    expect(getModelColor('a', [])).toBeUndefined();
  });
});
