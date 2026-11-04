/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType } from 'react';
import { Bullet, BulletSubtype, Settings } from '@elastic/charts';
import {
  IconChartGaugeArc,
  IconChartGaugeCircle,
  IconChartGaugeSemiCircle,
  IconChartHorizontalBullet,
  IconChartVerticalBullet,
} from '@kbn/chart-icons';
import {
  checkIsMaxContinuity,
  checkIsMinContinuity,
  CUSTOM_PALETTE,
  DEFAULT_CONTINUITY,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
  DEFAULT_RANGE_TYPE,
  getActivePaletteName,
  getOverridePaletteColors,
  type CustomPaletteParams,
  type PaletteContinuity,
  type PaletteDefinition,
  type PaletteOutput,
  type PaletteRegistry,
} from '@kbn/coloring';
import { LensConfigBuilder, type GaugeConfigESQL } from '@kbn/lens-embeddable-utils';
import { LENS_GAUGE_DEFAULT_COLOR_STEPS, type GaugeVisualizationState } from '@kbn/lens-common';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  framePreviewSvg,
  PREVIEW_CHART_HEIGHT,
  PREVIEW_WIDTH,
  renderChartPreviewSvg,
} from './preview_frame';
import { emptyPlaceholderSvg } from './preview_icons';
import { getPreviewPalettes } from './preview_palettes';
import { getDataSourceQuery, toRows } from './preview_table';
import type { PanelPreviewRenderer, PreviewTable } from './types';
import { getValueFormatter } from './value_format';

type GaugeShape = GaugeVisualizationState['shape'];
type Row = Record<string, unknown>;

/** The ES|QL columns of the gauge dimensions (`Accessors`). */
interface GaugeColumns {
  metric: string;
  min?: string;
  max?: string;
  goal?: string;
}

/** The palette `GaugeComponent` gets: the output of the `palette` expression function. */
interface GaugePalette {
  colors: string[];
  stops: number[];
  range: 'number' | 'percent';
  continuity: PaletteContinuity;
  rangeMin: number;
  rangeMax: number;
}

const TRANSPARENT = 'rgba(255,255,255,0)';
const SUBTYPES: Record<GaugeShape, BulletSubtype> = {
  horizontalBullet: BulletSubtype.horizontal,
  verticalBullet: BulletSubtype.vertical,
  semiCircle: BulletSubtype.halfCircle,
  arc: BulletSubtype.twoThirdsCircle,
  circle: BulletSubtype.circle,
};
// `getGaugeIconByType`
const ICONS: Record<GaugeShape, ComponentType> = {
  horizontalBullet: IconChartHorizontalBullet,
  verticalBullet: IconChartVerticalBullet,
  semiCircle: IconChartGaugeSemiCircle,
  arc: IconChartGaugeArc,
  circle: IconChartGaugeCircle,
};
// The Kibana palette behind each palette of Lens's palette service (`buildPalettes`).
const GRADIENT_PALETTES: Readonly<Record<string, string>> = {
  status: 'status',
  temperature: 'temperature',
  complementary: 'complementary',
  negative: 'red',
  positive: 'green',
  cool: 'cool',
  warm: 'warm',
  gray: 'gray',
};
const CATEGORICAL_PALETTES = ['default', 'elastic_line_optimized'];
// Lens's gauge palette for automatic colors (`getDefaultPalette`).
const DEFAULT_GAUGE_PALETTE: PaletteOutput<CustomPaletteParams> = {
  type: 'palette',
  name: 'status',
  params: {
    name: 'status',
    reverse: false,
    rangeType: DEFAULT_RANGE_TYPE,
    rangeMin: DEFAULT_MIN_STOP,
    rangeMax: DEFAULT_MAX_STOP,
    continuity: DEFAULT_CONTINUITY,
    steps: LENS_GAUGE_DEFAULT_COLOR_STEPS,
  },
};

const toPaletteDefinition = (
  id: string,
  getCategoricalColors: (size: number) => string[]
): PaletteDefinition => ({
  id,
  title: id,
  getCategoricalColors,
  getCategoricalColor: () => null,
  toExpression: () => ({ type: 'expression', chain: [] }),
});

// The part of Lens's palette service that gauges use, with the preview theme's palettes.
const getPaletteRegistry = (): PaletteRegistry => {
  const palettes = getPreviewPalettes();
  const definitions = new Map<string, PaletteDefinition>([
    ...Object.entries(GRADIENT_PALETTES).map(([id, kbnId]): [string, PaletteDefinition] => [
      id,
      toPaletteDefinition(id, (size) => palettes.get(kbnId).colors(size)),
    ]),
    ...CATEGORICAL_PALETTES.map((id): [string, PaletteDefinition] => [
      id,
      toPaletteDefinition(id, (size) => palettes.get(id).colors().slice(0, size)),
    ]),
  ]);
  return {
    get: (name) => {
      const definition = definitions.get(getActivePaletteName(name));
      if (!definition) {
        throw new Error(`The palette "${name}" does not exist`);
      }
      return definition;
    },
    getAll: () => [...definitions.values()],
  };
};

// Lens state -> `palette` expression (`toExpression`, `computePaletteParams`) -> its value
// (`paletteExpressionFn`).
const getGaugePalette = ({
  colorMode,
  palette,
}: GaugeVisualizationState): GaugePalette | undefined => {
  if (colorMode !== 'palette') return undefined;
  const activePalette = palette?.params ? palette : DEFAULT_GAUGE_PALETTE;
  const params: CustomPaletteParams = activePalette.params ?? {};
  // Expression arguments are cast to numbers, which turns the `null` stop of an open last step into 0.
  const stops =
    params.name === CUSTOM_PALETTE ? (params.stops ?? []).map(({ stop }) => stop ?? 0) : [];
  const continuity = params.continuity ?? 'above';
  return {
    colors: getOverridePaletteColors(getPaletteRegistry(), activePalette) ?? [],
    stops,
    range: params.rangeType ?? 'percent',
    continuity,
    rangeMin: checkIsMinContinuity(continuity)
      ? -Infinity
      : params.rangeMin ?? stops[0] ?? DEFAULT_MIN_STOP,
    rangeMax: checkIsMaxContinuity(continuity)
      ? Infinity
      : params.rangeMax ?? stops[stops.length - 1] ?? DEFAULT_MAX_STOP,
  };
};

// The band boundaries `GaugeComponent` draws (`normalizeBands`).
const normalizeBands = (
  { colors, stops, range, rangeMin, rangeMax }: GaugePalette,
  min: number,
  max: number
): number[] => {
  if (!stops.length) {
    const step = (max - min) / colors.length;
    return [min, ...colors.map((_, i) => min + (i + 1) * step)];
  }
  const toValue = (percent: number) => min + percent * ((max - min) / 100);
  const correctMin = range === 'percent' ? toValue(rangeMin) : rangeMin;
  const correctMax = range === 'percent' ? toValue(rangeMax) : rangeMax;
  const hasLowerBound = correctMin > min && isFinite(correctMin);
  const hasUpperBound = correctMax < max && isFinite(correctMax);
  const firstRanges = hasLowerBound ? [min, correctMin] : [min];
  const lastRanges = hasUpperBound ? [correctMax, max] : [max];
  if (range === 'percent') {
    const filteredStops = stops.filter(
      (stop) =>
        stop > 0 &&
        stop < 100 &&
        !(hasLowerBound && stop === rangeMin) &&
        !(hasUpperBound && stop === rangeMax)
    );
    return [...firstRanges, ...filteredStops.map(toValue), ...lastRanges];
  }
  const orderedStops = stops.filter(
    (stop) =>
      stop < max &&
      stop > min &&
      !(hasLowerBound && stop === correctMin) &&
      !(hasUpperBound && stop === correctMax)
  );
  return [...firstRanges, ...orderedStops, ...lastRanges];
};

// `computeMinMax`: percentages are taken of the band range without adding its minimum, like Lens.
const computeMinMax = ({ range, rangeMin, rangeMax }: GaugePalette, bands: number[]) => {
  const bandsMin = bands[0];
  const bandsMax = bands[bands.length - 1];
  if (range === 'percent') {
    return {
      min: isFinite(rangeMin) ? rangeMin * ((bandsMax - bandsMin) / 100) : bandsMin,
      max: isFinite(rangeMax) ? rangeMax * ((bandsMax - bandsMin) / 100) : bandsMax,
    };
  }
  return {
    min: isFinite(rangeMin) ? rangeMin : bandsMin,
    max: isFinite(rangeMax) ? rangeMax : bandsMax,
  };
};

// `workoutColorForValue` of the custom palette, as `GaugeComponent` calls it.
const getColorForValue = (
  value: number,
  palette: GaugePalette,
  bands: number[]
): string | undefined => {
  const { colors, stops, range, continuity, rangeMin, rangeMax } = palette;
  const bounds = computeMinMax(palette, bands);
  const isMinContinuity = checkIsMinContinuity(continuity);
  const isMaxContinuity = checkIsMaxContinuity(continuity);
  let normalized = value;
  if (range === 'percent') {
    normalized = (100 * (value - bounds.min)) / (bounds.max - bounds.min);
    if (!Number.isFinite(normalized)) normalized = rangeMin;
  }
  const [min, max] = range === 'percent' ? [0, 100] : [bounds.min, bounds.max];
  const minRange = isMinContinuity ? -Infinity : stops.length ? rangeMin : min;
  const maxRange = isMaxContinuity ? Infinity : stops.length ? rangeMax : max;
  if (normalized < minRange) return isMinContinuity ? colors[0] : undefined;
  if (normalized > maxRange) return isMaxContinuity ? colors[colors.length - 1] : undefined;
  if (stops.length) {
    const index = stops.findIndex((stop) => normalized < stop);
    return (
      colors[index] ??
      (normalized >= stops[stops.length - 1] ? colors[colors.length - 1] : colors[0])
    );
  }
  const step = (max - min) / colors.length;
  const index = colors.findIndex((_, i) => normalized <= min + (1 + i) * step);
  return (
    colors[index] ??
    (normalized >= min + colors.length * step ? colors[colors.length - 1] : colors[0])
  );
};

// A value inside the section that ends at `value`, which is what `GaugeComponent` colors it by.
const getPreviousSectionValue = (value: number, bands: number[]) => {
  const index = bands.indexOf(value);
  return index > 0 ? value - (bands[index] - bands[index - 1]) / 2 : value - 1;
};

// Band boundaries as ticks, without those closer than 10% of the range to a neighbor (`getTicksLabels`).
const getBandTicks = (bands: number[]) => {
  const tenPercentRange = (Math.max(...bands) - Math.min(...bands)) * 0.1;
  const lastIndex = bands.length - 1;
  return bands.filter(
    (stop, i) =>
      i === 0 ||
      i === lastIndex ||
      !(stop - bands[i - 1] < tenPercentRange || bands[lastIndex] - stop < tenPercentRange)
  );
};

// `getValueFromAccessor`: a number, or the last number of a multi-value field.
const getValueFromAccessor = (row: Row, column: string): number | undefined => {
  const value = row[column];
  const last = Array.isArray(value) ? value[value.length - 1] : value;
  return typeof last === 'number' ? last : undefined;
};

const isNumber = (value: unknown): value is number => typeof value === 'number';

// `getNiceRange(min, max).max`: a d3-like nice upper bound.
const getNiceMax = (min: number, max: number) => {
  const getNiceNumber = (range: number) => {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * Math.pow(10, exponent);
  };
  const offsetMax = max + 0.0000001;
  const tickSpacing = getNiceNumber(getNiceNumber(offsetMax - min) / 4);
  return Math.ceil(Math.ceil(offsetMax / tickSpacing) * tickSpacing);
};

// `getMinValue` without `respectRanges`, which Lens does not set.
const getMinValue = (row: Row, { metric, min, max }: GaugeColumns): number => {
  const minValue = min ? getValueFromAccessor(row, min) : undefined;
  if (minValue !== undefined) return minValue;
  const numbers = [row[metric], max ? row[max] : undefined].filter(isNumber);
  return Math.min(...numbers) <= 0 ? Math.min(...numbers) - 10 : 0;
};

// `getMaxValue` without `respectRanges`.
const getMaxValue = (row: Row, columns: GaugeColumns): number => {
  const { metric, max, goal } = columns;
  const maxValue = max ? getValueFromAccessor(row, max) : undefined;
  if (maxValue !== undefined) return maxValue;
  const minValue = getMinValue(row, columns);
  const numbers = [minValue, goal ? row[goal] : undefined, row[metric]].filter(isNumber);
  return getNiceMax(minValue, Math.max(...numbers));
};

const renderPlaceholderSvg = (
  title: string | undefined,
  shape: GaugeShape,
  message?: string
): string =>
  framePreviewSvg(
    title,
    emptyPlaceholderSvg({
      icon: ICONS[shape],
      message,
      width: PREVIEW_WIDTH,
      height: PREVIEW_CHART_HEIGHT,
    })
  );

/**
 * Draws a Lens gauge config (ES|QL) like `GaugeComponent` does: the API config goes through Lens's
 * own transform to Lens state, then every shape is an Elastic Charts Bullet with Lens's min, max and
 * goal defaults, palette bands, band ticks, title and subtitle, or Lens's empty placeholder.
 */
const renderGaugePreviewSvg = (config: GaugeConfigESQL, table: PreviewTable): string => {
  const { metric } = config;
  if (!metric?.column) {
    throw new Error('The gauge panel has no metric column');
  }
  const columns: GaugeColumns = {
    metric: metric.column,
    min: metric.min?.column,
    max: metric.max?.column,
    goal: metric.goal?.column,
  };
  const missing = Object.values(columns).filter(
    (name): name is string =>
      name !== undefined && !table.columns.some((column) => column.name === name)
  );
  if (missing.length) {
    throw new Error(`The ES|QL result has no column named ${missing.join(', ')}`);
  }

  const { state: lensState } = new LensConfigBuilder(undefined, true).fromAPIFormat(config);
  const state = lensState.visualization as GaugeVisualizationState;
  const shape = SUBTYPES[state.shape] ? state.shape : 'horizontalBullet';

  const row = toRows(table).find(
    (candidate) => isNumber(candidate[metric.column]) || Array.isArray(candidate[metric.column])
  );
  const value = row ? getValueFromAccessor(row, metric.column) : undefined;
  if (!row || value === undefined) {
    return renderPlaceholderSvg(config.title, shape);
  }
  const goal = columns.goal ? getValueFromAccessor(row, columns.goal) : undefined;
  const min = getMinValue(row, columns);
  const max = getMaxValue(row, columns);
  if (min === max) {
    return renderPlaceholderSvg(config.title, shape, 'Minimum and maximum values may not be equal');
  }
  if (min > max) {
    return renderPlaceholderSvg(
      config.title,
      shape,
      'Minimum value may not be greater than maximum value'
    );
  }

  const formatValue = getValueFormatter(
    metric.format ?? { type: 'custom', pattern: max - min > 5 ? '0,0' : '0,0.0' }
  );
  const palette = getGaugePalette(state);
  const bands = palette ? normalizeBands(palette, min, max) : [min, max];
  const ticksPosition = state.ticksPosition ?? 'auto';
  const ticks =
    ticksPosition === 'hidden' ? [] : ticksPosition === 'bands' ? getBandTicks(bands) : undefined;
  const labelMajorMode = state.labelMajorMode ?? 'auto';
  const metricName = metric.label ?? metric.column;
  const title =
    labelMajorMode === 'none'
      ? ''
      : labelMajorMode === 'auto'
      ? metricName
      : state.labelMajor || metricName;

  return renderChartPreviewSvg(
    config.title,
    <>
      <Settings theme={{ background: { color: 'transparent' } }} />
      <Bullet
        id="bullet"
        subtype={SUBTYPES[shape]}
        colorBands={
          palette
            ? {
                steps: bands,
                colors: bands
                  .slice(1)
                  .map(
                    (band) =>
                      getColorForValue(getPreviousSectionValue(band, bands), palette, bands) ??
                      TRANSPARENT
                  ),
              }
            : [euiThemeVars.euiColorLightShade, euiThemeVars.euiColorLightShade]
        }
        data={[
          [
            {
              // Like Lens, a goal of 0 is not drawn.
              target:
                goal && goal >= bands[0] && goal <= bands[bands.length - 1] ? goal : undefined,
              value,
              title,
              subtitle: state.labelMinor,
              domain: [min, max],
              ticks: ticks ? () => ticks : undefined,
              valueFormatter: formatValue,
              tickFormatter: formatValue,
            },
          ],
        ]}
      />
    </>
  );
};

export const gaugePreviewRenderer: PanelPreviewRenderer<GaugeConfigESQL> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderGaugePreviewSvg,
};
