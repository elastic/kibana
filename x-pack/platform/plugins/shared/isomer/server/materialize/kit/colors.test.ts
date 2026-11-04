/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { KbnPalette } from '@kbn/palettes';
import { paletteColors } from './colors';

describe('paletteColors', () => {
  // Kibana's default categorical palette is EUI's color-blind palette in both color modes.
  const euiColors = euiPaletteColorBlind({ rotations: 2 });

  it("returns Kibana's default palette for light and dark", () => {
    expect(paletteColors(12)).toEqual(
      euiColors.slice(0, 12).map((color) => ({ light: color, dark: color }))
    );
  });

  it('falls back to the default palette for an unknown palette', () => {
    expect(paletteColors(3, 'no-such-palette')).toEqual(paletteColors(3));
  });

  it('gives a palette with separate light and dark colors both', () => {
    const neutral = paletteColors(4, KbnPalette.Neutral);
    expect(neutral).toHaveLength(4);
    expect(neutral.some(({ light, dark }) => light !== dark)).toBe(true);
    for (const { light, dark } of neutral) {
      expect(light).toMatch(/^#[0-9a-f]{6}$/i);
      expect(dark).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
