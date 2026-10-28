/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveIcon } from '@elastic/isomer-sdk';

// Borealis-like fallbacks for a host that sets no `--isomer-icon-*` variable.
const paint = {
  accent: 'var(--isomer-icon-accent, #0b64dd)',
  bg: 'var(--isomer-icon-bg, #e8f1ff)',
  fg: 'var(--isomer-icon-fg, #1d2a3e)',
  muted: 'var(--isomer-icon-muted, #a8c8f5)',
} as const;

export type IconPaint = typeof paint;

/** A 16×16 icon on the pack's rounded tile, with `draw` returning the glyph's SVG elements. */
export const componentIcon = (draw: (colors: IconPaint) => string): PrimitiveIcon => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" rx="3" fill="${
    paint.bg
  }"/>${draw(paint)}</svg>`,
});
