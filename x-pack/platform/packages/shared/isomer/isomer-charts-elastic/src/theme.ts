/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's chart theme for Borealis. Sources, elastic/kibana main: `kbn-charts-theme/index.ts`,
// `charts/public/services/theme/theme.ts` (`getChartsBaseTheme`), and Lens's
// `expression_xy/public/components/xy_chart.tsx` (its `Settings` theme overrides).

import { getChartsTheme, LEGACY_LIGHT_THEME, type PartialTheme, type Theme } from '@elastic/charts';
import type { ColorMode } from '@kbn/isomer-primitives-charts';

const NUMERIC_FONT = "'Elastic UI Numeric', ";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const prefixFontFamilies = (value: Json): Json => {
  if (Array.isArray(value)) {
    return value.map(prefixFontFamilies);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === 'fontFamily' && typeof entry === 'string'
        ? `${NUMERIC_FONT}${entry}`
        : prefixFontFamilies(entry),
    ])
  );
};

const baseTheme = (mode: ColorMode): Theme => {
  const theme = prefixFontFamilies(
    structuredClone(
      getChartsTheme('borealis', mode === 'dark' ? 'DARK' : 'LIGHT')
    ) as unknown as Json
  ) as unknown as Theme;
  const { fill } = theme.axes.tickLabel;
  theme.axes.axisTitle = { ...theme.axes.axisTitle, fill, fontWeight: 500 };
  theme.axes.axisPanelTitle = {
    ...theme.axes.axisPanelTitle,
    fill,
    fontWeight: 500,
  };
  return theme;
};

const themes = { light: baseTheme('light'), dark: baseTheme('dark') };

/** The charts plugin's base theme, as every Kibana chart receives it. */
export const kibanaBaseTheme = (mode: ColorMode): Theme => themes[mode];

/** What Lens's xy chart lays over the base theme on an embeddable. */
export const lensXyTheme: PartialTheme = {
  background: { color: 'transparent' },
  chartMargins: LEGACY_LIGHT_THEME.chartMargins,
};
