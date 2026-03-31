/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIGHT_THEME, DARK_THEME } from '@elastic/charts';

export const isDarkMode =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const baseTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;

export const transparentBackground = { background: { color: 'transparent' } };

/**
 * The theme's categorical viz palette. Used to explicitly color partition chart
 * slices/tiles because `@elastic/charts` Partition layers require an explicit
 * `shape.fillColor` — there is no automatic palette assignment.
 */
export const vizColors: string[] = baseTheme.colors?.vizColors ?? [
  '#16C5C0',
  '#A6EDEA',
  '#61A2FF',
  '#BFDBFF',
  '#EE72A6',
  '#FFC7DB',
  '#F6726A',
  '#FFC9C2',
  '#EAAE01',
  '#FCD883',
];

/**
 * Returns a `shape.fillColor` accessor for a partition layer.
 * `sortIndex` is the positional index of the slice within its ring, which
 * we use to cycle through `vizColors`.
 */
export const partitionFillColor = (_key: unknown, sortIndex: number): string =>
  vizColors[sortIndex % vizColors.length];
