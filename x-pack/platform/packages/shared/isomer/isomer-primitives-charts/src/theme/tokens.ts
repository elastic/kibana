/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every value the pack renders, and every value it hands an engine. Colors are Borealis: chrome and the
// categorical palette from `@elastic/charts` 73.3.0 `LIGHT_THEME` / `DARK_THEME`, tones and ramps from EUI's
// Borealis primitive and severity colors. Literals, so the pack depends on neither.

import { cq, lightDark, type ScaleToken } from '@elastic/distillate';

const px = (n: number): ScaleToken => cq(`${n}px`, `${n}px`);
const literal = (value: string): ScaleToken => cq(value, value);

/** Scheme-varying chrome: `LIGHT_THEME` / `DARK_THEME` background, axis, and title fills. */
const color = {
  surface: lightDark('#FFFFFF', '#111C2C'),
  text: lightDark('#1D2A3E', '#CAD3E2'),
  textSubdued: lightDark('#516381', '#8E9FBC'),
  gridline: lightDark('#E3E8F2', '#2B394F'),
  border: lightDark('#E3E8F2', '#2B394F'),
  focus: lightDark('#2476F0', '#61A2FF'),
} as const;

/** EC's `vizColors`, identical in both schemes; a series takes the entry at its index, wrapping. */
const series = {
  c0: literal('#16C5C0'),
  c1: literal('#A6EDEA'),
  c2: literal('#61A2FF'),
  c3: literal('#BFDBFF'),
  c4: literal('#EE72A6'),
  c5: literal('#FFC7DB'),
  c6: literal('#F6726A'),
  c7: literal('#FFC9C2'),
  c8: literal('#EAAE01'),
  c9: literal('#FCD883'),
} as const;

/** EUI Borealis `severityColors`, identical in both schemes. */
const tone = {
  neutral: literal('#B5E5F2'),
  success: literal('#24C292'),
  warning: literal('#FCD883'),
  risk: literal('#FF995E'),
  danger: literal('#EE4C48'),
} as const;

/** EUI Borealis teal 20–100 for sequential scales; blue and red 100–20 meeting at gridline grey for diverging. */
const ramp = {
  sequential: {
    s0: literal('#C9F3F0'),
    s1: literal('#77E5E0'),
    s2: literal('#16C5C0'),
    s3: literal('#009E99'),
    s4: literal('#047471'),
  },
  diverging: {
    low2: literal('#1750BA'),
    low1: literal('#61A2FF'),
    mid: literal('#E3E8F2'),
    high1: literal('#F6726A'),
    high2: literal('#A71627'),
  },
} as const;

const font = {
  family: literal(
    "'Inter', 'Inter UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
  ),
  /** EC's tick label and axis title sizes. */
  size: { tick: px(10), title: px(12), body: px(14) },
  weight: {
    regular: literal('400'),
    title: literal('500'),
    strong: literal('700'),
  },
  lineHeight: literal('1.4'),
} as const;

const space = { px2: px(2), px4: px(4), px8: px(8), px12: px(12) } as const;

const stroke = { hairline: px(1) } as const;

/** Text the engine-free surfaces print. */
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
  series,
  tone,
  ramp,
  font,
  space,
  stroke,
  glyph,
  /** The height `prepareCharts` draws at when the host gives none. */
  figure: { height: px(320) },
  /** `chartCardFrame`: its width, and per chart the drawing plus title, legend, and gap. */
  frame: {
    width: px(640),
    chartHeight: px(400),
    gap: px(16),
    padding: px(16),
  },
  legend: { swatch: px(10), gap: space.px8, itemGap: space.px12 },
  table: { cellPadding: px(4) },
} as const;
