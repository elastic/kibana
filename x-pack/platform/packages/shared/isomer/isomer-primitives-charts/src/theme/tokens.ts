/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every value the pack renders. Colors are Borealis chrome from `@elastic/charts` 73.3.0 `LIGHT_THEME` / `DARK_THEME`,
// as literals so the pack does not depend on it.

import { cq, lightDark, type ScaleToken } from '@elastic/distillate';

const px = (n: number): ScaleToken => cq(`${n}px`, `${n}px`);
const literal = (value: string): ScaleToken => cq(value, value);

/** Scheme-varying chrome: `LIGHT_THEME` / `DARK_THEME` axis and title fills. */
const color = {
  text: lightDark('#1D2A3E', '#CAD3E2'),
  textSubdued: lightDark('#516381', '#8E9FBC'),
  border: lightDark('#E3E8F2', '#2B394F'),
} as const;

const font = {
  family: literal(
    "'Inter', 'Inter UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
  ),
  /** EC's axis title size. */
  size: { title: px(12), body: px(14) },
  weight: { title: literal('500') },
  lineHeight: literal('1.4'),
} as const;

const space = { px8: px(8) } as const;

const stroke = { hairline: px(1) } as const;

/** Text the surfaces print. */
const glyph = {
  /** A value the data marks as missing. */
  missing: literal('—'),
  /** Between a value and its unit when the unit is a word. */
  unitGap: literal(' '),
  /** Between the labels of a nested item's ancestors, root first. */
  pathSeparator: literal(' › '),
  /** Around an item's key, printed after a label another item shares. */
  keyOpen: literal(' ('),
  keyClose: literal(')'),
  /** Between the two ends of a value range. */
  range: literal(' – '),
  /** Before the upper end of a range open below, and the lower end of one open above. */
  below: literal('< '),
  atLeast: literal('≥ '),
  /** Between the row and column names in a matrix's corner. */
  axisPair: literal(' / '),
} as const;

export const CHART_THEME = {
  color,
  font,
  space,
  stroke,
  glyph,
  table: { cellPadding: px(4) },
} as const;
