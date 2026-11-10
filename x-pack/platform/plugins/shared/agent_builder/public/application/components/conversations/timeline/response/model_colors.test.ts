/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getModelColors } from './model_colors';

const palette = ['#c0', '#c1', '#c2', '#c3', '#c4'];

const getAloneColor = (key: string): string | undefined => getModelColors([key], palette)[0];

describe('getModelColors', () => {
  it('gives a model the same colour every time', () => {
    expect(getAloneColor('claude-opus')).toBe(getAloneColor('claude-opus'));
  });

  // Pins the result of the hash: changing it would change the colour of every model for every user.
  it('keeps the colour of known models', () => {
    expect(getAloneColor('claude-opus')).toBe('#c0');
    expect(getAloneColor('gpt-5')).toBe('#c1');
    expect(getAloneColor('google-gemini-3.5-flash-lite')).toBe('#c2');
    expect(getAloneColor('gemini-flash')).toBe('#c3');
    expect(getAloneColor('anthropic-claude-4.5-haiku')).toBe('#c4');
  });

  it('always returns a colour of the palette', () => {
    for (const key of ['a', 'claude-opus', 'anthropic-claude-4.5-haiku', '.google-gemini-flash']) {
      expect(palette).toContain(getAloneColor(key));
    }
  });

  it('spreads the models over the palette', () => {
    const keys = Array.from({ length: 40 }, (_, i) => `model-${i}`);

    const used = new Set(keys.map(getAloneColor));

    expect(used.size).toBe(palette.length);
  });

  it('gives a model its hash colour when no other model has it', () => {
    expect(getModelColors(['claude-opus', 'gpt-5'], palette)).toEqual(['#c0', '#c1']);
  });

  it('gives the next free colour to a model whose colour is taken', () => {
    expect(getModelColors(['claude-opus', 'claude-opus'], palette)).toEqual(['#c0', '#c1']);
  });

  it('wraps around the palette to find a free colour', () => {
    expect(
      getModelColors(['anthropic-claude-4.5-haiku', 'anthropic-claude-4.5-haiku'], palette)
    ).toEqual(['#c4', '#c0']);
  });

  it('gives different colours to as many models as the palette has colours', () => {
    const keys = Array.from({ length: palette.length }, () => 'claude-opus');

    expect(new Set(getModelColors(keys, palette)).size).toBe(palette.length);
  });

  it('reuses colours when there are more models than colours', () => {
    const keys = Array.from({ length: palette.length + 2 }, () => 'claude-opus');

    const colors = getModelColors(keys, palette);

    expect(colors).toHaveLength(keys.length);
    colors.forEach((color) => expect(palette).toContain(color));
  });

  it('returns the same colours every time', () => {
    const keys = ['gpt-5', 'claude-opus', 'claude-opus'];

    expect(getModelColors(keys, palette)).toEqual(getModelColors(keys, palette));
  });

  it('returns no colour for an empty palette', () => {
    expect(getModelColors(['a', 'b'], [])).toEqual([undefined, undefined]);
  });
});
