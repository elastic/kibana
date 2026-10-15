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

  it('depends only on the model, not on the other models of the response', () => {
    const alone = getModelColor('gemini-flash', palette);
    const models = ['claude-opus', 'gemini-flash', 'gpt-5'];

    expect(models.map((key) => getModelColor(key, palette))[1]).toBe(alone);
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
