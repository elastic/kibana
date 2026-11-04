/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import type { ColorBand, HeatmapSpec } from '@elastic/charts';
import { Heatmap, LIGHT_THEME, Position, ScaleType, Settings } from '@elastic/charts';
import {
  checkIsMaxContinuity,
  checkIsMinContinuity,
  CUSTOM_PALETTE,
  DEFAULT_COLOR_STEPS,
} from '@kbn/coloring';
import type { HeatmapVisualizationState, TextBasedLayerColumn } from '@kbn/lens-common';
import { LENS_HEATMAP_DEFAULT_PALETTE_NAME } from '@kbn/lens-common';
import { IconChartHeatmap } from '@kbn/chart-icons';
import { LensConfigBuilder, type HeatmapConfigESQL } from '@kbn/lens-embeddable-utils';
import {
  framePreviewSvg,
  PREVIEW_CHART_HEIGHT,
  PREVIEW_WIDTH,
  renderChartPreviewSvg,
} from './preview_frame';
import { emptyPlaceholderSvg } from './preview_icons';
import { getPreviewPalettes } from './preview_palettes';
import { DATE_TYPES, getDataSourceQuery, NUMBER_TYPES, toRows } from './preview_table';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';
import { getValueFormatter } from './value_format';

type HeatmapColumn = HeatmapConfigESQL['x'];

const LEGEND_POSITIONS: Record<string, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};
// `LegendSizeToPixels`, by Lens state legend size; `auto` (the Lens default) fits the content.
const LEGEND_SIZES: Record<string, number | undefined> = {
  small: 80,
  medium: 130,
  large: 180,
  xlarge: 230,
};
// The default `dateFormat:scaled` rules, from the largest interval down.
const SCALED_DATE_FORMATS: ReadonlyArray<[number, string]> = [
  [moment.duration(1, 'y').asMilliseconds(), 'YYYY'],
  [moment.duration(1, 'd').asMilliseconds(), 'YYYY-MM-DD'],
  [moment.duration(1, 'h').asMilliseconds(), 'YYYY-MM-DD HH:mm'],
  [moment.duration(1, 'm').asMilliseconds(), 'HH:mm'],
  [moment.duration(1, 's').asMilliseconds(), 'HH:mm:ss'],
  [0, 'HH:mm:ss.SSS'],
];
const SMATTERING = 0.00001;
// EUI's subdued text color, which Elastic Charts' light theme also uses for tick labels.

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** The `CustomPaletteState` the heatmap expression gets from the Lens palette state. */
interface PaletteState {
  colors: string[];
  stops: number[];
  range: 'percent' | 'number';
  rangeMin: number;
  rangeMax: number;
}

/**
 * Lens heatmap `toExpression` (`computePaletteParams`) and the `palette` expression function:
 * named palettes get their colors from the palette service and spread them evenly, custom ones
 * keep their stops. Without a palette the heatmap falls back to the default temperature one.
 */
const getPaletteState = (palette: HeatmapVisualizationState['palette']): PaletteState => {
  const params = palette?.params;
  if (!params) {
    return {
      colors: getPreviewPalettes()
        .get(LENS_HEATMAP_DEFAULT_PALETTE_NAME)
        .colors(DEFAULT_COLOR_STEPS),
      stops: [],
      range: 'percent',
      rangeMin: 0,
      rangeMax: 100,
    };
  }
  const isCustom = palette.name === CUSTOM_PALETTE;
  const stops = isCustom ? (params.stops ?? []).map(({ stop }) => stop) : [];
  const colors = isCustom
    ? (params.stops ?? []).map(({ color }) => color)
    : getPreviewPalettes()
        .get(palette.name ?? LENS_HEATMAP_DEFAULT_PALETTE_NAME)
        .colors(params.steps || params.stops?.length || DEFAULT_COLOR_STEPS);
  // The custom palette `toExpression` defaults `continuity` to `above`.
  const continuity = params.continuity ?? 'above';
  return {
    colors,
    stops,
    range: params.rangeType ?? 'percent',
    rangeMin: checkIsMinContinuity(continuity) ? -Infinity : params.rangeMin ?? stops[0] ?? 0,
    rangeMax: checkIsMaxContinuity(continuity)
      ? Infinity
      : params.rangeMax ?? stops[stops.length - 1] ?? 100,
  };
};

/** The color bands `HeatmapComponent` builds from the palette and the value range. */
const getColorBands = (
  { colors, stops, range, rangeMin, rangeMax }: PaletteState,
  { min, max }: { min: number; max: number },
  lastRangeIsRightOpen: boolean
): ColorBand[] => {
  const isPercent = range === 'percent';
  const evenStops = colors.slice(1).map((_, index) => {
    const maxValue = isPercent ? 100 : max;
    const minValue = isPercent ? 0 : min;
    return minValue + ((index + 1) * (maxValue - minValue)) / colors.length;
  });
  const ranges = [
    stops.length ? rangeMin : isPercent ? 0 : min,
    ...(stops.length ? stops.slice(0, -1) : evenStops),
  ].map((value) => (isPercent ? min + ((max - min) * value) / 100 : value));
  // A right-closed last band ends just above the range max, so the max itself is included.
  const endValueDistinctBounds =
    (isPercent ? min + ((max - min) * rangeMax) / 100 : rangeMax) + SMATTERING;
  const hasSingleValue = max === min;
  return ranges.map((start, index) => {
    const isLast = index === ranges.length - 1;
    const end = !isLast
      ? ranges[index + 1]
      : lastRangeIsRightOpen || hasSingleValue
      ? Infinity
      : endValueDistinctBounds;
    return {
      start: isLast && hasSingleValue && isPercent ? min : start,
      end,
      color: colors[index],
    };
  });
};

// The smallest gap between two x values, which Lens uses as the interval of ES|QL time buckets.
const getMinInterval = (values: number[]): number | undefined => {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((value, index) => value - sorted[index]);
  return gaps.length ? Math.min(...gaps) : undefined;
};

// Whether every bucket starts on an interval boundary of `timeZone`, the way Elastic Charts snaps
// the time grid (`esFixedIntervalSnap`).
const isAlignedIn = (values: number[], interval: number, timeZone: string): boolean =>
  values.every(
    (value) => (value + moment.tz(value, timeZone).utcOffset() * 60_000) % interval === 0
  );

const getSortPredicate = (
  sort: HeatmapVisualizationState['gridConfig']['xSortPredicate'],
  isNumeric: boolean
): HeatmapSpec['xSortPredicate'] => {
  if (!sort) return 'dataIndex';
  if (isNumeric) return sort === 'asc' ? 'numAsc' : 'numDesc';
  return sort === 'asc' ? 'alphaAsc' : 'alphaDesc';
};

// Lens formats dates with `dateFormat` in `dateFormat:tz`, and other values with the column format.
const getLabelFormatter = (
  column: HeatmapColumn,
  type: string | undefined,
  { dateFormat, timeZone }: PreviewContext
) => {
  const formatNumber = getValueFormatter(column.format);
  const isDate = DATE_TYPES.has(type ?? '');
  return (value: string | number): string => {
    if (typeof value !== 'number') return String(value ?? '');
    return isDate ? moment.tz(value, timeZone).format(dateFormat) : formatNumber(value);
  };
};

/** The Lens state the API config becomes (`fromAPItoLensState`), with the text-based columns. */
const getLensState = (
  config: HeatmapConfigESQL
): { visualization: HeatmapVisualizationState; columns: TextBasedLayerColumn[] } => {
  const { state } = new LensConfigBuilder().fromAPIFormat(config);
  const layers = state.datasourceStates.textBased?.layers ?? {};
  return {
    // The heatmap transform builds a `HeatmapVisualizationState`.
    visualization: state.visualization as HeatmapVisualizationState,
    columns: Object.values(layers).flatMap((layer) => layer.columns),
  };
};

/** Lens's empty state (`EmptyPlaceholder`): the heatmap icon above "No results found". */
const renderEmptyPreviewSvg = (title: string | undefined): string =>
  framePreviewSvg(
    title,
    emptyPlaceholderSvg({
      icon: IconChartHeatmap,
      width: PREVIEW_WIDTH,
      height: PREVIEW_CHART_HEIGHT,
    })
  );

/**
 * Draws a Lens heatmap config (ES|QL) with Elastic Charts' headless renderer, following the Lens
 * state transform, the heatmap `toExpression` and `HeatmapComponent`: color bands, time, linear or
 * ordinal x axes, cell labels, titles and legend.
 */
const renderHeatmapPreviewSvg = async (
  config: HeatmapConfigESQL,
  table: PreviewTable,
  context: PreviewContext
): Promise<string> => {
  const { x, y, metric } = config;
  const columnTypes = new Map(table.columns.map(({ name, type }) => [name, type]));
  const missing = [x, y, metric].find((column) => column && !columnTypes.has(column.column));
  if (missing) {
    throw new Error(`The query result has no "${missing.column}" column`);
  }
  // Lens draws the rows whose value is a number or null.
  const data = toRows(table).filter(
    (row) => row[metric.column] === null || typeof row[metric.column] === 'number'
  );
  if (!data.length) {
    return renderEmptyPreviewSvg(config.title);
  }

  const { visualization, columns } = getLensState(config);
  const { gridConfig, legend } = visualization;
  const getName = (accessor: string | undefined, column: HeatmapColumn) => {
    const lensColumn = columns.find(({ columnId }) => columnId === accessor);
    return (lensColumn?.customLabel ? lensColumn.label : undefined) ?? column.column;
  };
  const xName = getName(visualization.xAccessor, x);
  const yName = y ? getName(visualization.yAccessor, y) : '';
  const metricName = getName(visualization.valueAccessor, metric);

  const values = data.map((row) => row[metric.column]).filter(isNumber);
  const minMax = values.length
    ? { min: Math.min(...values), max: Math.max(...values) }
    : { min: 0, max: 100 };

  // ES|QL date columns are always on a time scale; otherwise the scale follows the type the Lens
  // state stores for the x column (from `axis.x.scale`, `string` when unset), not the data type.
  const xType = columnTypes.get(x.column) ?? 'keyword';
  const isTimeX = DATE_TYPES.has(xType);
  const lensXType = columns.find(({ columnId }) => columnId === visualization.xAccessor)?.meta
    ?.type;
  const xValues = data.map((row) => row[x.column]).filter(isNumber);
  const xInterval = isTimeX || lensXType === 'date' ? getMinInterval(xValues) : undefined;
  const xScale: HeatmapSpec['xScale'] =
    data.length <= 1
      ? { type: ScaleType.Ordinal }
      : isTimeX || lensXType === 'date'
      ? xInterval
        ? { type: ScaleType.Time, interval: { type: 'fixed', unit: 'ms', value: xInterval } }
        : { type: ScaleType.Linear }
      : lensXType === 'number'
      ? { type: ScaleType.Linear }
      : { type: ScaleType.Ordinal };
  const isTimeScale = xScale.type === ScaleType.Time;
  // Lens queries ES|QL in the display time zone, so its buckets line up with Elastic Charts' grid.
  // Buckets computed in another zone (UTC) keep a grid in that zone, labeled in the display one.
  const gridTimeZone =
    !xInterval || isAlignedIn(xValues, xInterval, context.timeZone) ? context.timeZone : 'UTC';
  const datePattern =
    SCALED_DATE_FORMATS.find(([interval]) => (xInterval ?? 0) >= interval)?.[1] ?? 'HH:mm:ss.SSS';
  const formatX =
    isTimeScale && isTimeX
      ? (value: string | number) => moment.tz(value, context.timeZone).format(datePattern)
      : getLabelFormatter(x, xType, context);
  const yType = y ? columnTypes.get(y.column) : undefined;

  return renderChartPreviewSvg(
    config.title,
    <>
      <Settings
        showLegend={legend.isVisible}
        legendPosition={LEGEND_POSITIONS[legend.position] ?? Position.Right}
        legendSize={legend.legendSize ? LEGEND_SIZES[legend.legendSize] : undefined}
        xDomain={isTimeScale && context.timeRange ? context.timeRange : undefined}
        theme={{
          legend: {
            labelOptions: { maxLines: legend.shouldTruncate ? legend.maxLines ?? 1 : 0 },
          },
          heatmap: {
            grid: {
              stroke: {
                width: gridConfig.strokeWidth ?? LIGHT_THEME.axes.gridLine.horizontal.strokeWidth,
                color: gridConfig.strokeColor ?? LIGHT_THEME.axes.gridLine.horizontal.stroke,
              },
            },
            cell: {
              maxWidth: 'fill',
              maxHeight: 'fill',
              label: {
                visible: gridConfig.isCellLabelVisible,
                minFontSize: 8,
                maxFontSize: 18,
                useGlobalMinFontSize: true,
              },
              border: { strokeWidth: 0 },
            },
            yAxisLabel: {
              visible: Boolean(y) && gridConfig.isYAxisLabelVisible,
              textColor: LIGHT_THEME.axes.tickLabel.fill,
              padding: yName ? 8 : 0,
            },
            xAxisLabel: {
              visible: gridConfig.isXAxisLabelVisible,
              textColor: LIGHT_THEME.axes.tickLabel.fill,
              padding: xName ? 8 : 0,
              rotation: Math.abs(gridConfig.xAxisLabelRotation ?? 0),
            },
          },
        }}
      />
      <Heatmap
        id="heatmap"
        name={metricName}
        colorScale={{
          type: 'bands',
          bands: getColorBands(
            getPaletteState(visualization.palette),
            minMax,
            visualization.palette?.params?.continuity
              ? checkIsMaxContinuity(visualization.palette.params.continuity)
              : true
          ),
        }}
        data={data}
        xAccessor={x.column}
        // Without a y dimension every cell sits in one unnamed row.
        yAccessor={y ? y.column : () => ''}
        valueAccessor={metric.column}
        valueFormatter={getValueFormatter(metric.format)}
        xScale={xScale}
        timeZone={gridTimeZone}
        xSortPredicate={
          isTimeX ? undefined : getSortPredicate(gridConfig.xSortPredicate, NUMBER_TYPES.has(xType))
        }
        ySortPredicate={
          y ? getSortPredicate(gridConfig.ySortPredicate, NUMBER_TYPES.has(yType ?? '')) : undefined
        }
        xAxisLabelName={xName}
        yAxisLabelName={yName}
        xAxisTitle={gridConfig.isXAxisTitleVisible ? gridConfig.xTitle ?? xName : undefined}
        yAxisTitle={gridConfig.isYAxisTitleVisible ? gridConfig.yTitle ?? yName : undefined}
        xAxisLabelFormatter={formatX}
        yAxisLabelFormatter={y ? getLabelFormatter(y, yType, context) : String}
      />
    </>
  );
};

export const heatmapPreviewRenderer: PanelPreviewRenderer<HeatmapConfigESQL> = {
  getQuery: getDataSourceQuery,
  renderSvg: renderHeatmapPreviewSvg,
};
