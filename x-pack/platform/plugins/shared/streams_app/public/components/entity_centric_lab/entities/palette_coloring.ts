/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Value-ramp coloring for the Grouped grid (hex map), modelled on the
 * classic "Infrastructure inventory" waffle-map legend options
 * (Gradient / Steps, color palette, number of colors, reverse, auto
 * range, min / max).
 *
 * This is a *second* coloring paradigm layered next to the existing
 * severity tones (see `bucket_metrics.ts`): instead of mapping a value
 * to a semantic good/warning/danger tone via thresholds, palette mode
 * maps a numeric value onto a continuous color ramp between a low and a
 * high bound. It only ever applies to numeric metrics — categorical
 * metrics (Health, Phase, Status, …) keep their fixed semantic colors.
 *
 * Gated to ElasticOn by the caller (`GroupedGridView`'s
 * `enablePaletteColoring` prop); everywhere else the stored config is
 * ignored and tiles fall back to severity tones.
 */

import {
  colorPalette as colorPaletteGenerator,
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteCool,
  euiPaletteWarm,
  euiPaletteRed,
  euiPaletteGreen,
  euiPaletteGray,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type ColorMode = 'severity' | 'palette';
export type PaletteType = 'gradient' | 'steps';

/**
 * One user-defined threshold in Steps mode, mirroring the classic
 * Infrastructure inventory legend rows: a colour, a descriptive label,
 * and a threshold `value` in the metric's own units. A tile takes the
 * colour of the highest rule whose `value` it meets (see
 * {@link resolveStepColor}) — the same `>=` semantics the waffle map
 * uses (`calculateStepColor`).
 */
export interface StepRule {
  readonly color: string;
  readonly label: string;
  readonly value: number;
}

export const MIN_RULES = 2;
export const MAX_RULES = 18;
export type PaletteId =
  | 'cool'
  | 'warm'
  | 'temperature'
  | 'status'
  | 'green'
  | 'red'
  | 'blue'
  | 'gray';

/**
 * Per-bucket coloring configuration, persisted alongside the Color-by /
 * Stat selection. `mode: 'severity'` is the default so nothing changes
 * until a user explicitly opts a bucket into palette coloring.
 */
export interface ColoringConfig {
  readonly mode: ColorMode;
  readonly paletteId: PaletteId;
  readonly type: PaletteType;
  /** Number of colours for Gradient mode. */
  readonly steps: number;
  readonly reverse: boolean;
  readonly autoRange: boolean;
  readonly min: number | null;
  readonly max: number | null;
  /**
   * User-defined threshold rules for Steps mode. Undefined until the
   * user first switches a bucket to Steps (seeded from the metric's
   * warn/crit thresholds at that point).
   */
  readonly rules?: readonly StepRule[];
}

export const MIN_STEPS = 2;
export const MAX_STEPS = 20;
export const DEFAULT_STEPS = 10;

/** Smooth-gradient sampling resolution for per-tile interpolation. */
const GRADIENT_RESOLUTION = 64;

export const DEFAULT_COLORING: ColoringConfig = {
  mode: 'severity',
  paletteId: 'cool',
  type: 'gradient',
  steps: DEFAULT_STEPS,
  reverse: false,
  autoRange: true,
  min: null,
  max: null,
};

const PALETTE_FNS: Record<PaletteId, (steps: number) => string[]> = {
  cool: (steps) => euiPaletteCool(steps),
  warm: (steps) => euiPaletteWarm(steps),
  temperature: (steps) => euiPaletteForTemperature(steps),
  status: (steps) => euiPaletteForStatus(steps),
  green: (steps) => euiPaletteGreen(steps),
  red: (steps) => euiPaletteRed(steps),
  gray: (steps) => euiPaletteGray(steps),
  // No single-hue "blue" palette ships with EUI, so synthesize one from
  // a light→dark blue ramp (distinct from the teal-ish `cool`).
  blue: (steps) => colorPaletteGenerator(['#E6F1FA', '#1750BA'], steps),
};

export const PALETTE_OPTIONS: ReadonlyArray<{ readonly id: PaletteId; readonly label: string }> = [
  {
    id: 'cool',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.cool', {
      defaultMessage: 'Cool',
    }),
  },
  {
    id: 'warm',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.warm', {
      defaultMessage: 'Warm',
    }),
  },
  {
    id: 'temperature',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.temperature', {
      defaultMessage: 'Temperature',
    }),
  },
  {
    id: 'status',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.status', {
      defaultMessage: 'Status',
    }),
  },
  {
    id: 'green',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.green', {
      defaultMessage: 'Green',
    }),
  },
  {
    id: 'red',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.red', {
      defaultMessage: 'Red',
    }),
  },
  {
    id: 'blue',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.blue', {
      defaultMessage: 'Blue',
    }),
  },
  {
    id: 'gray',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.bucket.palette.gray', {
      defaultMessage: 'Gray',
    }),
  },
];

const clampSteps = (steps: number): number =>
  Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.round(steps)));

/**
 * Ordered list of colors for `paletteId`, reversed when requested. The
 * EUI palette functions interpolate smoothly for any count, so callers
 * ask for however many stops they need (band count in Steps mode,
 * {@link GRADIENT_RESOLUTION} in Gradient mode, a handful for previews).
 */
export const getPaletteColors = (
  paletteId: PaletteId,
  steps: number,
  reverse: boolean
): string[] => {
  const fn = PALETTE_FNS[paletteId] ?? PALETTE_FNS.cool;
  const colors = fn(clampSteps(steps));
  return reverse ? [...colors].reverse() : colors;
};

/**
 * Resolve the low / high bounds the ramp is stretched across. Manual
 * bounds win when auto-range is off and they're valid; otherwise the
 * range is derived from the bucket's own values, falling back to the
 * metric's declared range when the bucket has no spread.
 */
export const resolveColoringRange = (
  values: readonly number[],
  metricRange: { readonly min: number; readonly max: number },
  config: ColoringConfig
): { readonly min: number; readonly max: number } => {
  if (!config.autoRange && config.min !== null && config.max !== null && config.max > config.min) {
    return { min: config.min, max: config.max };
  }
  if (values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max > min) return { min, max };
  }
  return metricRange;
};

/**
 * Map a numeric value to a concrete palette color. Steps mode buckets
 * the value into one of N discrete bands; gradient mode interpolates
 * smoothly across a high-resolution ramp.
 */
export const resolvePaletteColor = (
  value: number,
  range: { readonly min: number; readonly max: number },
  config: ColoringConfig
): string => {
  const span = range.max - range.min;
  const fraction = span > 0 ? Math.min(1, Math.max(0, (value - range.min) / span)) : 0;
  if (config.type === 'steps') {
    const colors = getPaletteColors(config.paletteId, config.steps, config.reverse);
    const idx = Math.min(colors.length - 1, Math.floor(fraction * colors.length));
    return colors[idx];
  }
  const colors = getPaletteColors(config.paletteId, GRADIENT_RESOLUTION, config.reverse);
  const idx = Math.round(fraction * (colors.length - 1));
  return colors[idx];
};

/**
 * Steps-mode color for a value: the colour of the highest rule whose
 * threshold `value` the reading meets (`>=`), falling back to
 * `defaultColor` when it's below every rule. Rules are sorted ascending
 * so ordering in the editor doesn't affect the result.
 */
export const resolveStepColor = (
  value: number,
  rules: readonly StepRule[],
  defaultColor: string
): string => {
  const sorted = [...rules].sort((a, b) => a.value - b.value);
  return sorted.reduce((color, rule) => (value >= rule.value ? rule.color : color), defaultColor);
};

const isStepRule = (value: unknown): value is StepRule => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StepRule>;
  return (
    typeof candidate.color === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.value === 'number'
  );
};

/** Type guard for a persisted coloring blob (tolerates older shapes). */
export const isColoringConfig = (value: unknown): value is ColoringConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ColoringConfig>;
  return (
    (candidate.mode === 'severity' || candidate.mode === 'palette') &&
    typeof candidate.paletteId === 'string' &&
    (candidate.type === 'gradient' || candidate.type === 'steps') &&
    typeof candidate.steps === 'number' &&
    typeof candidate.reverse === 'boolean' &&
    typeof candidate.autoRange === 'boolean'
  );
};

/** Coerce an untrusted persisted blob into a valid config. */
export const normalizeColoring = (value: unknown): ColoringConfig => {
  if (!isColoringConfig(value)) return DEFAULT_COLORING;
  const paletteValid = PALETTE_OPTIONS.some((option) => option.id === value.paletteId);
  const rules = Array.isArray(value.rules) ? value.rules.filter(isStepRule) : undefined;
  return {
    mode: value.mode,
    paletteId: paletteValid ? value.paletteId : DEFAULT_COLORING.paletteId,
    type: value.type,
    steps: clampSteps(value.steps),
    reverse: value.reverse,
    autoRange: value.autoRange,
    min: typeof value.min === 'number' ? value.min : null,
    max: typeof value.max === 'number' ? value.max : null,
    rules: rules && rules.length > 0 ? rules : undefined,
  };
};
