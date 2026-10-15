/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignModelColors } from './model_colors';

const palette = ['#c0', '#c1', '#c2', '#c3', '#c4', '#c5', '#c6', '#c7', '#c8', '#c9'];

describe('assignModelColors', () => {
  it('gives the same colour to a model whatever the order of the keys', () => {
    const a = assignModelColors(['claude-opus', 'gemini-flash'], palette);
    const b = assignModelColors(['gemini-flash', 'claude-opus'], palette);

    expect(a).toEqual(b);
  });

  it('gives a model the same colour across responses', () => {
    const first = assignModelColors(['claude-opus', 'gemini-flash'], palette);
    const second = assignModelColors(['claude-opus', 'gemini-flash'], palette);

    expect(second['claude-opus']).toBe(first['claude-opus']);
  });

  it('gives different colours to the keys of a response while the palette has colours left', () => {
    const keys = Array.from({ length: palette.length }, (_, i) => `model-${i}`);

    const colors = assignModelColors(keys, palette);

    expect(new Set(Object.values(colors)).size).toBe(palette.length);
  });

  it('reuses colours when there are more keys than colours', () => {
    const keys = Array.from({ length: palette.length + 3 }, (_, i) => `model-${i}`);

    const colors = assignModelColors(keys, palette);

    expect(Object.keys(colors)).toHaveLength(keys.length);
    expect(Object.values(colors).every((color) => palette.includes(color))).toBe(true);
  });

  it('ignores duplicated keys', () => {
    expect(assignModelColors(['a', 'a'], palette)).toEqual(assignModelColors(['a'], palette));
  });

  it('returns no colour for an empty palette', () => {
    expect(assignModelColors(['a'], [])).toEqual({});
  });
});
