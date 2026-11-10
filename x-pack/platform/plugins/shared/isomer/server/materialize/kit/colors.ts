/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import type { ColorMapping } from '@kbn/coloring';
import { getColorFactory } from '@kbn/coloring';
import type { SerializedValue } from '@kbn/data-plugin/common';
import { deserializeField } from '@kbn/data-plugin/common';
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

/** A color as Kibana writes it (hex, `rgb()`, a CSS name), as a hex color. */
export const toHexColor = (color: string): HexColor => {
  if (!chroma.valid(color)) {
    throw new Error(`"${color}" is not a color.`);
  }
  const parsed = chroma(color);
  return (parsed.alpha() < 1 ? parsed.hex('rgba') : parsed.hex('rgb')) as HexColor;
};

/**
 * The color a Kibana color mapping gives each category, concrete for both color schemes, as
 * Kibana's charts pick them. `categories` are serialized values in the order the chart meets them;
 * each is looked up by its value, or by the matching entry of `values`.
 */
export const colorMappingColors = (
  categories: SerializedValue[],
  colorMapping: ColorMapping.Config,
  values: unknown[] = categories.map((category) => deserializeField(category))
): ConcreteColor[] => {
  const data = { type: 'categories' as const, categories };
  const light = getColorFactory(colorMapping, getPalettes(false), false, data);
  const dark = getColorFactory(colorMapping, getPalettes(true), true, data);
  return values.map((value) => ({
    light: toHexColor(light(value as Parameters<typeof light>[0])),
    dark: toHexColor(dark(value as Parameters<typeof dark>[0])),
  }));
};
