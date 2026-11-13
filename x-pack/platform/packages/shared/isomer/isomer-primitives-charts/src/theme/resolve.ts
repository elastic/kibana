/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tone } from '../model/tone';

import { chartDistillery } from './distillery';

export type ColorMode = 'light' | 'dark';

/** The pack theme as literals for one mode: what an engine maps onto its own theme, and nothing more. */
export interface ResolvedChartTheme {
  mode: ColorMode;
  surface: string;
  text: string;
  textSubdued: string;
  gridline: string;
  border: string;
  /** Categorical colors; series `i` takes `series[i % series.length]`. */
  series: readonly string[];
  tone: Readonly<Record<Tone, string>>;
  /** Low to high. */
  sequential: readonly string[];
  /** Low to high, with the midpoint color in the middle. */
  diverging: readonly string[];
  font: {
    family: string;
    tickSize: number;
    titleSize: number;
    bodySize: number;
  };
}

const resolve = (mode: ColorMode): ResolvedChartTheme => {
  const { color, series, tone, ramp, font } = chartDistillery.resolveValues(mode);
  return {
    mode,
    ...color,
    series: Object.values(series),
    tone,
    sequential: Object.values(ramp.sequential),
    diverging: Object.values(ramp.diverging),
    font: {
      family: font.family,
      tickSize: parseFloat(font.size.tick),
      titleSize: parseFloat(font.size.title),
      bodySize: parseFloat(font.size.body),
    },
  };
};

const resolved = { light: resolve('light'), dark: resolve('dark') };

export const resolveChartTheme = (mode: ColorMode): ResolvedChartTheme => resolved[mode];
