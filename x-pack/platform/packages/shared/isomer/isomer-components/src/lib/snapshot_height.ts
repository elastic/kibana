/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveMetrics, PrimitiveNode } from '@elastic/isomer-sdk';
import { CARD_FALLBACK_NODE_HEIGHT, borealisLight, cardContentWidth } from '@kbn/isomer-theme';

// Heights in this pack are estimates for a Kibana card (`createKibanaCardFrame`), which draws a snapshot at exactly the height its body's estimates add up to. They lean tall: the card centers its body, so an overestimate becomes even padding, while an underestimate eats into it. Replace them with the card measuring its content once Isomer can (elastic/isomer#256).

const px = (value: string): number => parseFloat(value);

const { border, font, size } = borealisLight;

/** Borealis sizes in pixels. */
export const SIZE = {
  xxs: px(size.xxs),
  xs: px(size.xs),
  s: px(size.s),
  m: px(size.m),
  base: px(size.base),
  l: px(size.l),
};

/** Borealis border widths in pixels. */
export const BORDER = { thin: px(border.width.thin), thick: px(border.width.thick) };

/** A Borealis text step: its font size and line height in pixels. */
export interface TextStep {
  fontSize: number;
  lineHeight: number;
}

const step = (name: keyof typeof font.size): TextStep => ({
  fontSize: px(font.size[name]),
  lineHeight: px(font.lineHeight[name]),
});

/** Borealis text steps in pixels. */
export const TEXT = {
  xs: step('xs'),
  s: step('s'),
  m: step('m'),
  l: step('l'),
  xl: step('xl'),
  xxl: step('xxl'),
};

// Inter's average advance is about half an em; this leans wide so wrapping estimates run tall.
const AVERAGE_ADVANCE_EM = 0.56;

// Roboto Mono, the code face, advances every glyph by 0.6em.
const CODE_ADVANCE_EM = 0.6;

/** The estimated width of one line of `text` at `fontSize`. */
export const textWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * AVERAGE_ADVANCE_EM;

const lineCount = (text: string, advance: number, inset: number): number => {
  const width = cardContentWidth() - inset;
  return text
    .split('\n')
    .reduce((lines, line) => lines + Math.max(1, Math.ceil((line.length * advance) / width)), 0);
};

/** How many lines `text` wraps to at `fontSize`, keeping its own line breaks, `inset` pixels in from the edges of the card being estimated. */
export const wrappedLines = (text: string, fontSize: number, inset = 0): number =>
  lineCount(text, fontSize * AVERAGE_ADVANCE_EM, inset);

/** {@link wrappedLines} for text set in the code face, as a `pre-wrap` code block wraps it. */
export const wrappedCodeLines = (text: string, fontSize: number, inset = 0): number =>
  lineCount(text, fontSize * CODE_ADVANCE_EM, inset);

/** The height of `text` set in `textStep`, wrapped `inset` pixels in from the card's edges. */
export const textHeight = (text: string, { fontSize, lineHeight }: TextStep, inset = 0): number =>
  wrappedLines(text, fontSize, inset) * lineHeight;

const heightsByType = new Map<string, (node: PrimitiveNode) => number>();

/** A primitive's `metrics`, whose `snapshotHeight` is its estimated height in the card plus the larger of its vertical margins: what it adds between neighbors whose margins collapse. Also registers it by `type`, so {@link bodyNodeHeight} can size a container's nodes. */
export const snapshotMetrics = <TNode extends PrimitiveNode>(
  type: TNode['type'],
  snapshotHeight: (node: TNode) => number
): PrimitiveMetrics<TNode> => {
  // Looked up by `node.type`, so the node is always the `TNode` this height was declared for.
  heightsByType.set(type, snapshotHeight as (node: PrimitiveNode) => number);
  return { snapshotHeight };
};

/** The estimated height of a node a container holds, or the card's fallback for a type this pack doesn't define. */
export const bodyNodeHeight = (node: PrimitiveNode): number =>
  heightsByType.get(node.type)?.(node) ?? CARD_FALLBACK_NODE_HEIGHT;
