/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { borealisDark, borealisLight, type BorealisTokenValues } from '@kbn/isomer-theme';

import type { VegaTheme } from './theme';

const palette = ({ color: { vis } }: BorealisTokenValues) => [
  vis.series0,
  vis.series1,
  vis.series2,
  vis.series3,
  vis.series4,
  vis.series5,
  vis.series6,
  vis.series7,
  vis.series8,
  vis.series9,
];

const type = ({ font }: BorealisTokenValues) => ({
  fontFamily: font.family.sans,
  labelFontSize: parseFloat(font.size.xxs),
  titleFontSize: parseFloat(font.size.s),
});

const fixed = (tokens: BorealisTokenValues, ramp: readonly string[]): VegaTheme => ({
  background: tokens.color.background.plain,
  text: tokens.color.text.paragraph,
  axis: tokens.color.border.plain,
  grid: tokens.color.border.subdued,
  gridOpacity: 1,
  palette: palette(tokens),
  ramp,
  ...type(tokens),
});

/** Borealis light: EUI's categorical vis palette and a teal ramp, light to dark. */
export const vegaBorealisLightTheme = fixed(borealisLight, [
  borealisLight.color.background.light.accentSecondary,
  borealisLight.color.vis.series0,
  borealisLight.color.vis.text0,
]);

/** Borealis dark: the light theme's ramp runs dark to light. */
export const vegaBorealisDarkTheme = fixed(borealisDark, [
  borealisDark.color.border.base.accentSecondary,
  borealisDark.color.vis.series0,
  borealisDark.color.vis.series1,
]);

/** Borealis palette and type with text and lines in `currentColor`, for surfaces without a color mode. */
export const vegaBorealisAdaptiveTheme: VegaTheme = {
  ...vegaBorealisLightTheme,
  background: 'transparent',
  text: 'currentColor',
  axis: 'currentColor',
  grid: 'currentColor',
  gridOpacity: 0.15,
  ramp: [
    borealisLight.color.vis.series1,
    borealisLight.color.vis.series0,
    borealisLight.color.vis.text0,
  ],
};
