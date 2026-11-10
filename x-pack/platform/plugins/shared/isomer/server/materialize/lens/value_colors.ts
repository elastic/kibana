/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_COLOR_STEPS, DEFAULT_PALETTE_NAME } from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import type { ColorBand } from '@kbn/isomer';
import type { DatatableConfigESQL } from '@kbn/lens-embeddable-utils';
import type { MaterializeLoss } from '../nodes';
import type { MaterializeKit } from '../types';
import { fixedColor } from './shared';
import type { LensApiColorMapping } from './types';

/** A Lens API color by value: steps, or a named palette spread over the values. */
export type LensColorByValue = Extract<
  NonNullable<NonNullable<DatatableConfigESQL['metrics']>[number]['color']>,
  { type: 'dynamic' | 'distributed_palette' | 'legacy_dynamic' }
>;

const BY_VALUE_TYPES: ReadonlySet<unknown> = new Set([
  'dynamic',
  'distributed_palette',
  'legacy_dynamic',
]);

export const isColorByValue = (color: object | undefined): color is LensColorByValue =>
  color !== undefined && 'type' in color && BY_VALUE_TYPES.has(color.type);

/** Whether a Lens API color is a color mapping, categorical or gradient. */
export const isColorMapping = (color: object | undefined): color is LensApiColorMapping =>
  color !== undefined && 'mode' in color;

/** Bands, and whether their bounds are values or percentages of a range the chart defines. */
export interface ValueBands {
  bands: ColorBand[];
  range: 'absolute' | 'percentage';
}

const PERCENT_MAX = 100;

/**
 * Lens's colors by value, as bands. `dynamic` steps become one band each: Kibana's charts
 * (`workoutColorForValue` in the charts plugin's palette helpers) color a value by the first stop
 * above it, and give the last band its upper bound, which an Isomer band does too. A named palette
 * (`distributed_palette`, `legacy_dynamic`) is spread over `steps` equal percentage bands, open at
 * both ends, as Lens's API transform builds it (`buildNamedPaletteLensState`: `continuity: 'all'`,
 * `rangeType: 'percent'`). Without one, Lens's default palette (`defaultPaletteParams`: `positive`,
 * 5 steps over 0–100%, `continuity: 'above'`) gives the same bands over the values.
 */
export const toValueBands = (
  color: LensColorByValue | undefined,
  {
    path,
    kit,
    losses,
    steps = DEFAULT_COLOR_STEPS,
  }: {
    path: string;
    kit: MaterializeKit;
    losses: MaterializeLoss[];
    steps?: number;
  }
): ValueBands => {
  if (color?.type === 'dynamic') {
    return {
      range: color.range,
      bands: color.steps.map(({ gte, lt, lte, color: stepColor }) => {
        const to = lt ?? lte;
        return {
          ...(gte != null ? { from: gte } : {}),
          ...(to != null ? { to } : {}),
          color: fixedColor(stepColor),
        };
      }),
    };
  }
  const palette = color?.palette ?? DEFAULT_PALETTE_NAME;
  const colors = kit.paletteColors(steps, palette);
  if (color?.type === 'legacy_dynamic' && color.shift) {
    losses.push({
      path: `${path}.shift`,
      kind: 'dropped',
      note: i18n.translate('xpack.isomer.materialize.lens.paletteShift', {
        defaultMessage: 'The shifted "{palette}" palette starts from its first color here.',
        values: { palette },
      }),
    });
  }
  if (color) {
    // A named palette has no stops, so `workoutColorForValue` finds a value's segment with `<=`:
    // a value on a boundary takes the lower band. Lens's default palette has stops, found with `<`.
    losses.push({
      path,
      kind: 'approximated',
      note: i18n.translate('xpack.isomer.materialize.lens.paletteBoundaries', {
        defaultMessage:
          'A value exactly on a boundary of the "{palette}" palette takes the band above it here, and the band below it in Kibana.',
        values: { palette },
      }),
    });
  }
  const width = PERCENT_MAX / steps;
  return {
    range: 'percentage',
    bands: colors.map((bandColor, index) => ({
      ...(index > 0 ? { from: index * width } : {}),
      ...(index < steps - 1 ? { to: (index + 1) * width } : {}),
      color: bandColor,
    })),
  };
};

/**
 * Percentage bands as values, over the range `[min, max]` the chart reads percentages against, as
 * `workoutColorForValue` normalizes a value into it. Absolute bands come back as they are.
 */
export const toAbsoluteBands = (
  { bands, range }: ValueBands,
  { min, max }: { min: number; max: number }
): ColorBand[] => {
  if (range === 'absolute') {
    return bands;
  }
  const at = (percent: number) => min + ((max - min) * percent) / PERCENT_MAX;
  return bands.map(({ from, to, color }) => ({
    ...(from !== undefined ? { from: at(from) } : {}),
    ...(to !== undefined ? { to: at(to) } : {}),
    color,
  }));
};

/** The smallest and largest finite numbers among `values`, or undefined when there are none. */
export const numberBounds = (values: unknown[]): { min: number; max: number } | undefined => {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values.flat()) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return min <= max ? { min, max } : undefined;
};
