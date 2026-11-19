/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default color palette and helper for building per-label color arrays.
 *
 * @packageDocumentation
 */

/** Default 20-color palette for cluster visualization. */
export const DEFAULT_COLORS: readonly string[] = [
  '#38bdf8',
  '#f472b6',
  '#a78bfa',
  '#34d399',
  '#fb923c',
  '#facc15',
  '#f87171',
  '#22d3ee',
  '#c084fc',
  '#4ade80',
  '#e879f9',
  '#2dd4bf',
  '#fca5a5',
  '#86efac',
  '#fde68a',
  '#a5b4fc',
  '#67e8f9',
  '#fdba74',
  '#d8b4fe',
  '#6ee7b7',
];

/** Slate gray color for noise / unclustered points. */
export const NOISE_COLOR = '#64748b';

/**
 * Build a color palette array that covers all label values.
 *
 * Cycles through `DEFAULT_COLORS` for labels beyond the palette size.
 * Optionally overrides a specific index with `NOISE_COLOR`.
 *
 * @param labels - Per-point label array (used to find max label).
 * @param options - Optional `noiseIndex` to color as noise.
 * @returns Palette array where `palette[label]` is a hex color string.
 */
export function buildColorPalette(labels: number[], options?: { noiseIndex?: number }): string[] {
  const palette = [...DEFAULT_COLORS];

  // Ensure palette covers all labels
  let maxLabel = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] > maxLabel) maxLabel = labels[i];
  }
  while (palette.length <= maxLabel) {
    palette.push(DEFAULT_COLORS[palette.length % DEFAULT_COLORS.length]);
  }

  // Override noise index
  if (options?.noiseIndex !== undefined && options.noiseIndex >= 0) {
    palette[options.noiseIndex] = NOISE_COLOR;
  }

  return palette;
}
