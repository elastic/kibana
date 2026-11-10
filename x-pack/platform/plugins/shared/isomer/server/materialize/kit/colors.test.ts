/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import type { ColorMapping } from '@kbn/coloring';
import { KbnPalette } from '@kbn/palettes';
import { colorMappingColors, paletteColors, toHexColor } from './colors';

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

describe('colorMappingColors', () => {
  const loop: ColorMapping.Config = {
    paletteId: KbnPalette.Default,
    colorMode: { type: 'categorical' },
    assignments: [
      { rules: [{ type: 'raw', value: 'b' }], color: { type: 'colorCode', colorCode: 'red' } },
    ],
    specialAssignments: [{ rules: [{ type: 'other' }], color: { type: 'loop' } }],
  };

  it('gives assigned categories their color and loops the palette over the rest', () => {
    // Unassigned categories take the palette's colors in the order they appear.
    const [first, second] = paletteColors(2);
    expect(colorMappingColors(['a', 'b', 'c'], loop)).toEqual([
      { light: first.light.toLowerCase(), dark: first.dark.toLowerCase() },
      { light: '#ff0000', dark: '#ff0000' },
      { light: second.light.toLowerCase(), dark: second.dark.toLowerCase() },
    ]);
  });
});

describe('toHexColor', () => {
  it('writes CSS colors as hex, keeping transparency', () => {
    expect(toHexColor('rgb(252, 196, 0)')).toBe('#fcc400');
    expect(toHexColor('#2B394F1A')).toBe('#2b394f1a');
    expect(() => toHexColor('not a color')).toThrow();
  });
});
