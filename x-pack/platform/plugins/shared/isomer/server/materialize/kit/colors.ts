/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColorValue } from '@kbn/isomer';
import { KbnPalette, getPalettes } from '@kbn/palettes';

type HexColor = `#${string}`;
/** A data color, concrete for both color schemes. */
export type ConcreteColor = Extract<ColorValue, { light: string }>;

const toHex = (color: string): HexColor => {
  if (!color.startsWith('#')) {
    throw new Error(`Palette color "${color}" is not a hex color.`);
  }
  return color as HexColor;
};

/**
 * The first `count` colors of a Kibana palette, concrete for both color schemes, as Kibana picks
 * them in light and dark mode. An unknown palette falls back to Kibana's default, as Kibana does.
 */
export const paletteColors = (
  count: number,
  paletteId: string = KbnPalette.Default
): ConcreteColor[] => {
  const light = getPalettes(false).get(paletteId);
  const dark = getPalettes(true).get(paletteId);
  return Array.from({ length: count }, (_, index) => ({
    light: toHex(light.getColor(index, count)),
    dark: toHex(dark.getColor(index, count)),
  }));
};
