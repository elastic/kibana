/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType, type SVGProps } from 'react';
import moment from 'moment-timezone';
import { LayoutDirection, Metric, Settings } from '@elastic/charts';
import type { MetricDatum, SecondaryMetricProps } from '@elastic/charts';
import { collectSpecs, renderChart, SvgCanvas } from '@elastic/charts/dist/headless';
import { resolveVisIcon } from '@kbn/chart-icons';
import {
  CUSTOM_PALETTE,
  checkIsMaxContinuity,
  checkIsMinContinuity,
  getOverridePaletteColors,
  type CustomPaletteParams,
  type PaletteContinuity,
  type PaletteOutput,
  type PaletteRegistry,
} from '@kbn/coloring';
import {
  buildTrendlineQueryWithMetricFieldMap,
  queryHasTsSourceCommand,
  LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS,
  LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR,
  type MetricVisualizationState,
} from '@kbn/lens-common';
import { euiLightVars as euiThemeVars } from '@kbn/ui-theme';
import {
  LensConfigBuilder,
  type LensApiConfig,
  type MetricConfigESQL,
} from '@kbn/lens-embeddable-utils';
import { getPreviewFont } from './preview_font';
import { framePreviewSvg, PREVIEW_CHART_HEIGHT, PREVIEW_WIDTH } from './preview_frame';
import { getPreviewPalettes } from './preview_palettes';
import { DATE_TYPES, getDataSourceQuery, NUMBER_TYPES, toRows } from './preview_table';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';
import { getValueFormatter } from './value_format';

type MetricColumn = MetricConfigESQL['metrics'][number];
type PrimaryMetric = Extract<MetricColumn, { type: 'primary' }>;
type SecondaryMetric = Extract<MetricColumn, { type: 'secondary' }>;
type SecondaryTrend = NonNullable<MetricVisualizationState['secondaryTrend']>;
type Row = Record<string, unknown>;

/** The params of a `palette` expression, which Lens colors values by (`CustomPaletteState`). */
interface ColorByValueParams {
  colors: string[];
  stops: number[];
  range: 'number' | 'percent';
  continuity: PaletteContinuity;
  rangeMin: number;
  rangeMax: number;
}

// `iconAlign` that the API schema defaults to.
const DEFAULT_ICON_ALIGN = 'right';
const TREND_ICONS = { down: '↓', up: '↑', stable: '=' } as const;
const NOT_AVAILABLE = 'N/A';
// Lens buckets the trendline on the data view time field, `@timestamp` for ES|QL.
const TIME_FIELD = '@timestamp';
const TREND_QUERY = 'trend';
// A metric tile does not need the full preview height: one row of tiles is 180px tall, more rows
// share up to `PREVIEW_CHART_HEIGHT`, and rows that do not fit are cut like in a scrolled panel.
const SINGLE_ROW_HEIGHT = 180;
const ROW_HEIGHT = 140;

// The palette service of the `charts` plugin, as far as `getOverridePaletteColors` uses it: named
// palettes are the `KbnPalettes` gradients of the same name (`buildPalettes`).
const previewPaletteRegistry: PaletteRegistry = {
  get: (name) => ({
    id: name,
    title: name,
    toExpression: () => ({ type: 'expression', chain: [] }),
    getCategoricalColor: () => null,
    getCategoricalColors: (size) => getPreviewPalettes().get(name).colors(size),
  }),
  getAll: () => [],
};

/**
 * The `palette` expression params Lens builds for a color by value palette: `computePaletteParams`
 * of the Lens metric (named palettes have no stops) and the defaults of the `palette` function.
 */
export const getColorByValueParams = (
  palette: PaletteOutput<CustomPaletteParams>
): ColorByValueParams => {
  const { params = {} } = palette;
  const stops = params.name === CUSTOM_PALETTE ? params.stops?.map(({ stop }) => stop) ?? [] : [];
  const continuity = params.continuity ?? 'above';
  return {
    colors: getOverridePaletteColors(previewPaletteRegistry, palette) ?? [],
    stops,
    range: params.rangeType ?? 'percent',
    continuity,
    rangeMin: checkIsMinContinuity(continuity)
      ? Number.NEGATIVE_INFINITY
      : params.rangeMin ?? stops[0] ?? 0,
    rangeMax: checkIsMaxContinuity(continuity)
      ? Number.POSITIVE_INFINITY
      : params.rangeMax ?? stops[stops.length - 1] ?? 100,
  };
};

/**
 * The color of `value` with the custom palette's `getColorForValue` (`workoutColorForValue` of the
 * `charts` plugin): by stops when there are some, else spread evenly over the range.
 */
export const getColorForValue = (
  value: number,
  { colors, stops, range, continuity, rangeMin, rangeMax }: ColorByValueParams,
  bounds: { min: number; max: number }
): string | undefined => {
  const percentage = (100 * (value - bounds.min)) / (bounds.max - bounds.min);
  const normalizedValue =
    range === 'percent' ? (Number.isFinite(percentage) ? percentage : rangeMin) : value;
  const [min, max] = range === 'percent' ? [0, 100] : [bounds.min, bounds.max];
  const isMinContinuity = checkIsMinContinuity(continuity);
  const isMaxContinuity = checkIsMaxContinuity(continuity);
  const minRange = isMinContinuity ? Number.NEGATIVE_INFINITY : stops.length ? rangeMin : min;
  const maxRange = isMaxContinuity ? Number.POSITIVE_INFINITY : stops.length ? rangeMax : max;
  if (normalizedValue < minRange) {
    return isMinContinuity ? colors[0] : undefined;
  }
  if (normalizedValue > maxRange) {
    return isMaxContinuity ? colors[colors.length - 1] : undefined;
  }
  if (stops.length) {
    const index = stops.findIndex((stop) => normalizedValue - stop < 0);
    return (
      colors[index] ??
      (normalizedValue >= stops[stops.length - 1] ? colors[colors.length - 1] : colors[0])
    );
  }
  const step = (max - min) / colors.length;
  const index = colors.findIndex((_, i) => normalizedValue - (min + (1 + i) * step) <= 0);
  return (
    colors[index] ??
    (normalizedValue >= min + colors.length * step ? colors[colors.length - 1] : colors[0])
  );
};

/** The Lens visualization state of an API config, from Lens's own API transform. */
export const getLensVisualizationState = <TState,>(config: LensApiConfig): TState =>
  new LensConfigBuilder(undefined, true).fromAPIFormat(config).state.visualization as TState;

const isPrimaryMetric = (metric: MetricColumn): metric is PrimaryMetric =>
  metric.type === 'primary';

const isSecondaryMetric = (metric: MetricColumn): metric is SecondaryMetric =>
  metric.type === 'secondary';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getColumnName = ({ column, label }: { column: string; label?: string }) => label ?? column;

const getStaticColor = (color: PrimaryMetric['color']): string | undefined =>
  color?.type === 'static' ? color.color : undefined;

const getTrendlineQuery = (config: MetricConfigESQL) => {
  const query = getDataSourceQuery(config);
  const primary = config.metrics.find(isPrimaryMetric);
  if (
    !query ||
    !primary ||
    primary.background_chart?.type !== 'trend' ||
    queryHasTsSourceCommand(query)
  ) {
    return undefined;
  }
  const secondary = config.metrics.find(isSecondaryMetric);
  return buildTrendlineQueryWithMetricFieldMap(
    query,
    TIME_FIELD,
    [primary.column, ...(secondary ? [secondary.column] : [])],
    config.breakdown_by ? [config.breakdown_by.column] : []
  );
};

/** Lens's own trendline query, when the panel has a trend background. */
const getMetricExtraQueries = (config: MetricConfigESQL): Record<string, string> => {
  const trendline = getTrendlineQuery(config);
  return trendline ? { [TREND_QUERY]: trendline.query } : {};
};

// `lens_collapse`: one row of the metric columns aggregated with `fn`.
const aggregate = (values: number[], fn: string) => {
  switch (fn) {
    case 'sum':
      return values.reduce((sum, value) => sum + value, 0);
    case 'avg':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values[0];
  }
};

const collapseRows = (rows: Row[], columns: string[], fn: string): Row[] =>
  rows.length === 0
    ? rows
    : [
        Object.fromEntries(
          columns.map((column) => [
            column,
            aggregate(rows.map((row) => row[column]).filter(isNumber), fn),
          ])
        ),
      ];

// `getDataBoundsForPalette` of the metric renderer.
const getPaletteBounds = (
  rows: Row[],
  rowIndex: number,
  { metric, max, breakdown }: { metric: string; max?: string; breakdown?: string }
) => {
  const values = rows.map((row) => Number(row[metric]));
  const smallest = Math.min(...values);
  const greatest = Math.max(...values);
  if (!max && !breakdown) {
    return greatest < 0 ? { min: greatest * 2, max: 0 } : { min: 0, max: greatest * 2 };
  }
  const maxValue = max ? Number(rows[rowIndex]?.[max]) : greatest;
  return breakdown && !max ? { min: smallest, max: greatest } : { min: 0, max: maxValue };
};

// `getMappedSecondaryTrendPalettes` and `getSecondaryTrendPalettes` of the Lens metric: badge
// backgrounds and texts for down, stable and up, with unknown palettes as `compare_to`.
const getCompareToPalettes = ({
  paletteId,
  reversed,
}: {
  paletteId: string;
  reversed: boolean;
}) => {
  const palettesById: Record<string, { palette: string[]; textPalette: string[] }> = {
    compare_to: {
      palette: [
        euiThemeVars.euiColorBackgroundLightDanger,
        euiThemeVars.euiColorBackgroundLightText,
        euiThemeVars.euiColorBackgroundLightSuccess,
      ],
      textPalette: [
        euiThemeVars.euiColorTextDanger,
        euiThemeVars.euiColorTextParagraph,
        euiThemeVars.euiColorTextSuccess,
      ],
    },
    complementary: {
      palette: [
        euiThemeVars.euiColorBackgroundLightPrimary,
        euiThemeVars.euiColorBackgroundLightText,
        euiThemeVars.euiColorBackgroundLightWarning,
      ],
      textPalette: [
        euiThemeVars.euiColorTextPrimary,
        euiThemeVars.euiColorTextParagraph,
        euiThemeVars.euiColorTextWarning,
      ],
    },
    temperature: {
      palette: [
        euiThemeVars.euiColorBackgroundLightPrimary,
        euiThemeVars.euiColorBackgroundLightText,
        euiThemeVars.euiColorBackgroundLightDanger,
      ],
      textPalette: [
        euiThemeVars.euiColorTextPrimary,
        euiThemeVars.euiColorTextParagraph,
        euiThemeVars.euiColorTextDanger,
      ],
    },
  };
  const { palette, textPalette } = palettesById[paletteId] ?? palettesById.compare_to;
  return reversed
    ? { palette: [...palette].reverse(), textPalette: [...textPalette].reverse() }
    : { palette, textPalette };
};

// `getSecondaryMetricInfo` of the metric renderer, with the trend config `MetricVis` builds.
const getSecondaryMetricProps = (
  secondary: SecondaryMetric,
  trend: SecondaryTrend | undefined,
  row: Row,
  primaryValue: unknown,
  showLabel: boolean
): Omit<SecondaryMetricProps, 'labelPosition'> => {
  const label = showLabel ? getColumnName(secondary) : '';
  const rawValue = row[secondary.column];
  const format = getValueFormatter(secondary.format);
  const formattedValue = isNumber(rawValue)
    ? format(rawValue)
    : rawValue == null
    ? NOT_AVAILABLE
    : String(rawValue);
  // `getColorMode`: a value that is not a number gets the static badge.
  const isNumeric = rawValue == null || typeof rawValue === 'number';
  if (trend?.type === 'static' || (trend?.type === 'dynamic' && !isNumeric)) {
    const color =
      trend.type === 'static' ? trend.color : LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR;
    return { value: formattedValue, label, badgeColor: color };
  }
  if (trend?.type !== 'dynamic') {
    return { value: formattedValue, label };
  }

  const isPrimaryNumeric = typeof primaryValue === 'number';
  const baseline = trend.baselineValue === 'primary' && !isPrimaryNumeric ? 0 : trend.baselineValue;
  const compareToPrimary = !Number.isFinite(baseline) && isPrimaryNumeric;
  const baselineValue = Number.isFinite(baseline)
    ? Number(baseline)
    : isPrimaryNumeric
    ? Number(primaryValue)
    : 0;
  const delta =
    isNumber(rawValue) && Number.isFinite(baselineValue)
      ? (compareToPrimary ? -1 : 1) * (rawValue - baselineValue)
      : NaN;
  const { palette, textPalette } = getCompareToPalettes(trend);
  const showIcon = trend.visuals !== 'value';
  const showValue = trend.visuals !== 'icon';
  const [colorIndex, icon] = Number.isNaN(delta)
    ? [1, undefined]
    : delta < 0
    ? [0, TREND_ICONS.down]
    : delta > 0
    ? [2, TREND_ICONS.up]
    : [1, TREND_ICONS.stable];
  // Compared to the primary metric, the delta shows with its sign (`alwaysShowSign`).
  const formatDelta = (value: number) => `${value > 0 ? '+' : ''}${format(value)}`;
  const valueToShow = !compareToPrimary
    ? formattedValue
    : Number.isNaN(delta)
    ? NOT_AVAILABLE
    : formatDelta(delta);
  if (showIcon && !showValue && !icon) {
    return { value: '', label, badgeColor: '' };
  }
  return {
    value: showValue ? valueToShow : '',
    label,
    badgeColor: palette[colorIndex],
    badgeTextColor: textPalette[colorIndex],
    icon: showIcon ? icon : undefined,
  };
};

// Like the field formatters' text: labels for blank and missing values, dates in Kibana's date
// format and time zone, numbers with the column format.
const getBreakdownFormatter = (
  breakdown: NonNullable<MetricConfigESQL['breakdown_by']>,
  type: string | undefined,
  { timeZone, dateFormat }: PreviewContext
) => {
  const formatNumber = getValueFormatter(breakdown.format);
  return (value: unknown) => {
    if (value === '') {
      return '(blank)';
    }
    if (value == null) {
      return '(null)';
    }
    if (DATE_TYPES.has(type ?? '') && isNumber(value)) {
      return moment.tz(value, timeZone).format(dateFormat);
    }
    return NUMBER_TYPES.has(type ?? '') && isNumber(value) ? formatNumber(value) : String(value);
  };
};

/** Loads the icon of a Lens metric (`icon` of its state), drawn like `getIcon` of the metric renderer. */
const loadMetricIcon = async (name: string | undefined): Promise<MetricDatum['icon']> => {
  if (!name || name === 'empty') {
    return undefined;
  }
  const type = resolveVisIcon(name);
  if (typeof type !== 'string') {
    return type;
  }
  const { typeToPathMap } = await import('@elastic/eui/lib/components/icon/icon_map');
  const { icon } = await typeToPathMap[type]();
  // EUI icon components spread their props onto the root `<svg>`.
  const Icon = icon as ComponentType<SVGProps<SVGSVGElement>>;
  return ({ width, height, color }: { width: number; height: number; color: string }) => (
    <Icon width={width} height={height} fill={color} aria-hidden="true" />
  );
};

// The trend of each tile (`metricTrendline`), keyed by breakdown value; with a collapse function,
// one trend of the values at each time aggregated with it.
const getTrends = (
  config: MetricConfigESQL,
  trendTable: PreviewTable | undefined,
  { breakdown, collapseFn }: { breakdown?: string; collapseFn?: string }
) => {
  const trends = new Map<unknown, Array<{ x: number; y: number }>>();
  const trendline = trendTable ? getTrendlineQuery(config) : undefined;
  const primary = config.metrics.find(isPrimaryMetric);
  if (!trendTable || !trendline || !primary) {
    return trends;
  }
  const metricColumn = trendline.metricFieldMap.get(primary.column) ?? primary.column;
  const rows = toRows(trendTable);
  const byTime = new Map<number, number[]>();
  rows.forEach((row) => {
    const x = Number(row[trendline.timeField]);
    const y = row[metricColumn];
    if (collapseFn) {
      byTime.set(x, [...(byTime.get(x) ?? []), ...(isNumber(y) ? [y] : [])]);
      return;
    }
    const key = breakdown ? row[breakdown] : undefined;
    trends.set(key, [...(trends.get(key) ?? []), { x, y: isNumber(y) ? y : NaN }]);
  });
  if (collapseFn) {
    trends.set(
      undefined,
      [...byTime].map(([x, values]) => ({ x, y: aggregate(values, collapseFn) ?? NaN }))
    );
  }
  return trends;
};

/**
 * Builds the Metric tiles from the ES|QL rows like `MetricVis` does from the Lens expression:
 * titles, values, colors, icon, secondary metric, progress bar and trend.
 */
const getMetricData = async (
  config: MetricConfigESQL,
  table: PreviewTable,
  context: PreviewContext
): Promise<MetricDatum[]> => {
  const primary = config.metrics.find(isPrimaryMetric);
  if (!primary) {
    throw new Error('The metric panel has no primary metric');
  }
  const secondary = config.metrics.find(isSecondaryMetric);
  const lensState = getLensVisualizationState<MetricVisualizationState>(config);
  const rows = toRows(table);
  const bar = primary.background_chart?.type === 'bar' ? primary.background_chart : undefined;
  const maxColumn = bar?.max_value.column;
  const { breakdown_by: breakdownBy, styling } = config;
  const collapseFn = breakdownBy?.collapse_by;
  const metricColumns = [primary.column, secondary?.column, maxColumn].filter(
    (column): column is string => column !== undefined
  );
  const breakdown = collapseFn ? undefined : breakdownBy;
  const tableRows = collapseFn ? collapseRows(rows, metricColumns, collapseFn) : rows;
  const formatBreakdownValue = breakdown
    ? getBreakdownFormatter(
        breakdown,
        table.columns.find(({ name }) => name === breakdown.column)?.type,
        context
      )
    : undefined;

  const primaryName = getColumnName(primary);
  const formatPrimary = getValueFormatter(primary.format);
  const isNumericMetric = tableRows.some((row) => typeof row[primary.column] === 'number');
  const { euiColorEmptyShade: defaultColor } = euiThemeVars;
  // `getDefaultColor` of the Lens metric visualization.
  const configColor =
    getStaticColor(primary.color) ??
    (bar && isNumericMetric
      ? euiThemeVars.euiColorVis2
      : primary.apply_color_to === 'value'
      ? euiThemeVars.euiColorVisText0
      : defaultColor);
  const paletteParams =
    lensState.palette?.params && isNumericMetric
      ? getColorByValueParams(lensState.palette)
      : undefined;
  const secondaryLabel = styling?.secondary?.label;
  const showSecondaryLabel = secondaryLabel?.visible ?? false;
  const labelPosition = showSecondaryLabel ? secondaryLabel?.placement ?? 'before' : 'before';
  const icon = await loadMetricIcon(lensState.icon);
  const trends = getTrends(config, context.extraTables[TREND_QUERY], {
    breakdown: breakdown?.column,
    collapseFn,
  });

  // Without a breakdown there is one tile, N/A when the query returned no row.
  const tileRows = breakdown ? tableRows : tableRows.slice(0, 1);
  return (tileRows.length > 0 ? tileRows : [{ [primary.column]: null }]).map((row, rowIndex) => {
    const rawValue = row[primary.column];
    const value: number | string = rawValue == null ? NaN : (rawValue as number | string);
    const title = formatBreakdownValue
      ? formatBreakdownValue(row[breakdown?.column ?? ''])
      : primaryName;
    const subtitle = breakdown ? primaryName : primary.subtitle;
    const paletteColor =
      paletteParams && isNumber(value)
        ? getColorForValue(
            value,
            paletteParams,
            getPaletteBounds(tableRows, rowIndex, {
              metric: primary.column,
              max: maxColumn,
              breakdown: breakdown?.column,
            })
          ) ?? defaultColor
        : undefined;
    const tileColor = paletteColor ?? configColor;
    const extra = secondary
      ? {
          ...getSecondaryMetricProps(
            secondary,
            lensState.secondaryTrend,
            row,
            value,
            showSecondaryLabel
          ),
          labelPosition,
        }
      : undefined;

    if (typeof value !== 'number') {
      return {
        value: String(value),
        title,
        subtitle,
        icon,
        extra,
        color: primary.apply_color_to
          ? getStaticColor(primary.color) ?? defaultColor
          : defaultColor,
      };
    }
    const base = {
      value,
      valueFormatter: formatPrimary,
      title,
      subtitle,
      icon,
      extra,
      color: tileColor,
    };
    const trend = trends.get(breakdown ? row[breakdown.column] : undefined);
    if (primary.background_chart?.type === 'trend' && trend) {
      return { ...base, trend, trendShape: 'area' as const };
    }
    if (maxColumn) {
      return {
        ...base,
        domainMax: Number(row[maxColumn]),
        progressBarDirection:
          bar?.orientation === 'horizontal' ? LayoutDirection.Horizontal : LayoutDirection.Vertical,
      };
    }
    if (primary.apply_color_to === 'value') {
      return {
        ...base,
        color: defaultColor,
        valueColor: tileColor === defaultColor ? undefined : tileColor,
      };
    }
    return base;
  });
};

/**
 * Draws a Lens metric panel (ES|QL) with Elastic Charts' headless Metric renderer, with the theme
 * overrides and the API to expression defaults Lens uses.
 */
const renderMetricPreviewSvg = async (
  config: MetricConfigESQL,
  table: PreviewTable,
  context: PreviewContext
): Promise<string> => {
  const data = await getMetricData(config, table, context);
  const columns = config.breakdown_by
    ? config.breakdown_by.columns ?? LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS
    : 1;
  const grid: MetricDatum[][] = [];
  for (let index = 0; index < data.length; index += columns) {
    grid.push(data.slice(index, index + columns));
  }
  const height =
    grid.length <= 1 ? SINGLE_ROW_HEIGHT : Math.min(PREVIEW_CHART_HEIGHT, grid.length * ROW_HEIGHT);
  const { styling } = config;
  const canvas = new SvgCanvas(PREVIEW_WIDTH, height, { font: getPreviewFont() });
  renderChart({
    specs: collectSpecs(
      <>
        <Settings
          theme={{
            background: { color: euiThemeVars.euiColorEmptyShade },
            metric: {
              barBackground: euiThemeVars.euiColorLightestShade,
              emptyBackground: euiThemeVars.euiColorEmptyShade,
              blendingBackground: euiThemeVars.euiColorEmptyShade,
              titlesTextAlign: styling?.primary?.labels?.alignment ?? 'left',
              valueTextAlign: styling?.primary?.value?.alignment ?? 'right',
              extraTextAlign: styling?.secondary?.value?.alignment ?? 'right',
              iconAlign: styling?.icon?.alignment ?? DEFAULT_ICON_ALIGN,
              valueFontSize: styling?.primary?.value?.sizing === 'fill' ? 'fit' : 'default',
              spacing: styling?.density === 'compact' ? 'small' : 'large',
              valuePosition: styling?.primary?.position ?? 'bottom',
            },
          }}
        />
        <Metric id="metric" data={grid} />
      </>
    ),
    width: PREVIEW_WIDTH,
    height,
    context: canvas.context,
    Path2D: canvas.Path2D,
  });
  return framePreviewSvg(config.title, canvas.toSvg(), height);
};

export const metricPreviewRenderer: PanelPreviewRenderer<MetricConfigESQL> = {
  getQuery: getDataSourceQuery,
  getExtraQueries: getMetricExtraQueries,
  renderSvg: renderMetricPreviewSvg,
};
