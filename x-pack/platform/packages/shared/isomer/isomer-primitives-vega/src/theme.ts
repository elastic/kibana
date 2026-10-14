/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The palette and type a chart draws with; the one source of every value `vegaConfig` emits. */
export interface VegaTheme {
  /** Behind the plot; `transparent` lets the host surface show through. */
  background: string;
  /** Titles, labels, and legend text. */
  text: string;
  /** Axis domains and ticks. */
  axis: string;
  grid: string;
  gridOpacity: number;
  /** Categorical series colours, in order. */
  palette: readonly string[];
  /** Low-to-high ramp for sequential scales. */
  ramp: readonly string[];
  fontFamily: string;
  labelFontSize: number;
  titleFontSize: number;
}

const elasticPalette = [
  '#54B399',
  '#6092C0',
  '#D36086',
  '#9170B8',
  '#CA8EAE',
  '#D6BF57',
  '#B9A888',
  '#DA8B45',
  '#AA6556',
  '#E7664C',
] as const;

const fontFamily =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Text and lines in `currentColor`, so an inline SVG follows the host's
 * light or dark text colour; the palette reads on either background.
 */
export const vegaAdaptiveTheme: VegaTheme = {
  background: 'transparent',
  text: 'currentColor',
  axis: 'currentColor',
  grid: 'currentColor',
  gridOpacity: 0.15,
  palette: elasticPalette,
  ramp: ['#D6F2EA', '#54B399', '#1F6B55'],
  fontFamily,
  labelFontSize: 11,
  titleFontSize: 13,
};

export const vegaLightTheme: VegaTheme = {
  ...vegaAdaptiveTheme,
  background: '#FFFFFF',
  text: '#343741',
  axis: '#98A2B3',
  grid: '#D3DAE6',
  gridOpacity: 1,
};

export const vegaDarkTheme: VegaTheme = {
  ...vegaAdaptiveTheme,
  background: '#1D1E24',
  text: '#DFE5EF',
  axis: '#535966',
  grid: '#343741',
  gridOpacity: 1,
  ramp: ['#1F6B55', '#54B399', '#D6F2EA'],
};

const guide = (theme: VegaTheme) => ({
  labelColor: theme.text,
  titleColor: theme.text,
  labelFont: theme.fontFamily,
  titleFont: theme.fontFamily,
  labelFontSize: theme.labelFontSize,
  titleFontSize: theme.labelFontSize,
});

const shared = (theme: VegaTheme) => ({
  background: theme.background,
  axis: {
    ...guide(theme),
    domainColor: theme.axis,
    tickColor: theme.axis,
    gridColor: theme.grid,
    gridOpacity: theme.gridOpacity,
  },
  legend: guide(theme),
  title: {
    color: theme.text,
    subtitleColor: theme.text,
    font: theme.fontFamily,
    subtitleFont: theme.fontFamily,
    fontSize: theme.titleFontSize,
  },
  range: {
    category: [...theme.palette],
    ramp: [...theme.ramp],
    heatmap: [...theme.ramp],
  },
});

/** A Vega `config` for `theme`. A spec's own `config` is merged over it. */
export const vegaConfig = (theme: VegaTheme) => ({
  ...shared(theme),
  text: { fill: theme.text, font: theme.fontFamily },
  rule: { stroke: theme.text },
  style: {
    'guide-label': { fill: theme.text, font: theme.fontFamily },
    'guide-title': { fill: theme.text, font: theme.fontFamily },
    'group-title': { fill: theme.text, font: theme.fontFamily },
    'group-subtitle': { fill: theme.text, font: theme.fontFamily },
  },
});

/** A Vega-Lite `config` for `theme`, passed to `compile` so the spec's own `config` wins. */
export const vegaLiteConfig = (theme: VegaTheme) => ({
  ...shared(theme),
  font: theme.fontFamily,
  header: guide(theme),
  view: { stroke: 'transparent' },
  ...(theme.palette[0] !== undefined && { mark: { color: theme.palette[0] } }),
});
