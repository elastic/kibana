/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import numeral from '@elastic/numeral';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  BarSeries,
  ColorVariant,
  CurveType,
  Fit,
  HorizontalAlignment,
  LEGACY_LIGHT_THEME,
  LabelOverflowConstraint,
  LayoutDirection,
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  StackMode,
  VerticalAlignment,
} from '@elastic/charts';
import type {
  AreaSeriesStyle,
  AxisStyle,
  DomainRange,
  LegendPositionConfig,
  LineAnnotationStyle,
  LinearGradient,
  PartialTheme,
  RecursivePartial,
  SeriesColorAccessorFn,
  XScaleType,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { DEFAULT_COLOR_MAPPING_CONFIG, getColorFactory } from '@kbn/coloring';
import type { ColorMapping } from '@kbn/coloring';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { XYConfigESQL } from '@kbn/lens-embeddable-utils';
import type { XYDataLayerConfig, XYPersistedState, YConfig } from '@kbn/lens-common';
import {
  IconChartArea,
  IconChartAreaPercentage,
  IconChartAreaStacked,
  IconChartBar,
  IconChartBarHorizontal,
  IconChartBarHorizontalPercentage,
  IconChartBarHorizontalStacked,
  IconChartBarPercentage,
  IconChartBarStacked,
  IconChartLine,
} from '@kbn/chart-icons';
import { getPreviewPalettes } from './preview_palettes';
import { emptyPlaceholderSvg } from './preview_icons';
import {
  PREVIEW_CHART_HEIGHT,
  PREVIEW_WIDTH,
  framePreviewSvg,
  renderChartPreviewSvg,
} from './preview_frame';
import { DATE_TYPES, NUMBER_TYPES, getColumnType, toRows } from './preview_table';
import type { PanelPreviewRenderer, PreviewContext, PreviewTable } from './types';
import { getValueFormatter, type ValueFormat } from './value_format';

type XyPreviewConfig = XYConfigESQL;
type ApiLayer = XyPreviewConfig['layers'][number];
type ApiDataLayer = Extract<ApiLayer, { y: unknown }>;
type ApiReferenceLineLayer = Extract<ApiLayer, { type: 'reference_lines' }>;
type ApiAnnotationLayer = Extract<ApiLayer, { type: 'annotations' }>;
type ApiColumn = ApiDataLayer['y'][number];
type ApiThreshold = ApiReferenceLineLayer['thresholds'][number];
type Row = Record<string, unknown>;
type SeriesKind = 'bar' | 'line' | 'area';
type DateUnit = moment.unitOfTime.Base;
type Extent = NonNullable<XYPersistedState['yLeftExtent']>;
type AxisSide = 'left' | 'right';

interface BucketInterval {
  value: number;
  unit: DateUnit;
}

interface DataLayer {
  state: XYDataLayerConfig;
  api: ApiDataLayer;
  kind: SeriesKind;
  isStacked: boolean;
  isPercentage: boolean;
  isHorizontal: boolean;
  isHistogram: boolean;
  isTime: boolean;
  xScaleType: XScaleType;
  rows: Row[];
  splitColumn?: string;
  paletteId: string;
  colorMapping?: ColorMapping.Config;
}

interface YAxisGroup {
  side: AxisSide;
  groupId: string;
  position: Position;
  series: Array<{ layer: DataLayer; column: ApiColumn }>;
  format: (value: number) => string;
}

// Lens's ES|QL date histograms (`dateHistogramTextBasedFn`) and the XY chart's default colors.
const ESQL_UNITS: Record<string, DateUnit> = {
  millisecond: 'ms',
  second: 's',
  minute: 'm',
  hour: 'h',
  day: 'd',
  week: 'w',
  month: 'M',
  year: 'y',
};
const FIXED_UNITS: DateUnit[] = ['w', 'd', 'h', 'm', 's', 'ms'];
const CALENDAR_UNITS: DateUnit[] = ['d', 'w', 'M', 'y'];
const DAY = moment.duration(1, 'd').asMilliseconds();
const SERIES_BY_KIND = { area: AreaSeries, bar: BarSeries, line: LineSeries } as const;
const LEGEND_SIZES: Record<string, number | undefined> = {
  small: 80,
  medium: 130,
  large: 180,
  xlarge: 230,
};
const PERCENT_PATTERN = '0.[00]%';
const DEFAULT_LEGEND_TITLE = 'Legend';
const LEGEND_TRUNCATE_WIDTH_LIMIT = 1000;
const LINES_MARKER_SIZE = 20;
// `euiLightVars.euiColorDarkShade`, `defaultAnnotationColor`, `defaultAnnotationRangeColor` and
// `euiLightVars.euiColorDanger` of the light Borealis theme.
const REFERENCE_LINE_COLOR = '#5A6D8C';
const ANNOTATION_COLOR = '#2B394F';
const ANNOTATION_RANGE_COLOR = '#2B394F1A';
const CURRENT_TIME_COLOR = '#C61E25';
const OUTSIDE_RECT_ANNOTATION_WIDTH = 8;
const NULL_LABEL = '(null)';
// The chart icon of each series type (`visualizationDefinitions`), shown by the empty placeholder.
const SERIES_TYPE_ICONS: Record<string, typeof IconChartBar> = {
  bar: IconChartBar,
  bar_stacked: IconChartBarStacked,
  bar_horizontal: IconChartBarHorizontal,
  bar_percentage_stacked: IconChartBarPercentage,
  bar_horizontal_stacked: IconChartBarHorizontalStacked,
  bar_horizontal_percentage_stacked: IconChartBarHorizontalPercentage,
  line: IconChartLine,
  area: IconChartArea,
  area_stacked: IconChartAreaStacked,
  area_percentage_stacked: IconChartAreaPercentage,
};

const isDataLayer = (layer: ApiLayer): layer is ApiDataLayer => 'y' in layer;
const isReferenceLineLayer = (layer: ApiLayer): layer is ApiReferenceLineLayer =>
  layer.type === 'reference_lines';
const isAnnotationLayer = (layer: ApiLayer): layer is ApiAnnotationLayer =>
  layer.type === 'annotations';
const isStateDataLayer = (layer: XYPersistedState['layers'][number]): layer is XYDataLayerConfig =>
  layer.layerType === 'data';

const getDataLayerQuery = (layer: ApiDataLayer): string | undefined =>
  layer.data_source.type === 'esql' ? layer.data_source.query : undefined;

const getColumnLabel = ({ column, label }: { column: string; label?: string }) => label ?? column;

/** The ES|QL date bucket interval: from the column metadata when ES|QL returns it, else from the data. */
const getBucketInterval = (
  table: PreviewTable,
  column: string,
  xValues: number[]
): BucketInterval | undefined => {
  const bucket = table.columns.find(({ name }) => name === column)?._meta?.bucket;
  const bucketUnit = bucket && ESQL_UNITS[bucket.unit];
  if (bucket && bucketUnit) {
    return { value: bucket.interval, unit: bucketUnit };
  }
  const sorted = [...new Set(xValues)].sort((a, b) => a - b);
  const step = Math.min(...sorted.slice(1).map((value, index) => value - sorted[index]));
  if (!Number.isFinite(step) || step <= 0) return undefined;
  if (step >= 365 * DAY) return { value: Math.round(step / (365.25 * DAY)), unit: 'y' };
  if (step >= 28 * DAY) return { value: Math.round(step / (30.44 * DAY)), unit: 'M' };
  const unit =
    FIXED_UNITS.find((candidate) => step % moment.duration(1, candidate).asMilliseconds() === 0) ??
    'ms';
  return { value: step / moment.duration(1, unit).asMilliseconds(), unit };
};

const isFullyContained = (
  bucketStart: moment.Moment,
  from: moment.Moment,
  to: moment.Moment,
  { value, unit }: BucketInterval
) => !bucketStart.isBefore(from) && !bucketStart.clone().add(value, unit).isAfter(to);

// Lens's `getDomainBounds`: the first and last full buckets of the time range.
const getDomainBounds = (
  from: moment.Moment,
  to: moment.Moment,
  anchor: number,
  interval: BucketInterval,
  timeZone: string
): { min: number; max: number } | undefined => {
  const { value, unit } = interval;
  const anchorTime = moment.tz(anchor, timeZone);
  const start = anchorTime
    .clone()
    .subtract(Math.ceil(anchorTime.diff(from, unit, true) / value) * value, unit);
  const end = anchorTime
    .clone()
    .add(Math.floor(to.diff(anchorTime, unit, true) / value) * value, unit);
  const min = isFullyContained(start, from, to, interval) ? start : start.clone().add(value, unit);
  const max = isFullyContained(end, from, to, interval) ? end : end.clone().subtract(value, unit);
  return min.valueOf() > max.valueOf() ? undefined : { min: min.valueOf(), max: max.valueOf() };
};

// Lens's `lens_collapse`: one row per x value, with each metric aggregated over the breakdown.
const collapseRows = (
  rows: Row[],
  xColumn: string | undefined,
  yColumns: string[],
  fn: string
): Row[] => {
  const groups = new Map<unknown, Row[]>();
  rows.forEach((row) => {
    const key = xColumn ? row[xColumn] : '';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return [...groups].map(([key, group]) => ({
    ...(xColumn ? { [xColumn]: key } : {}),
    ...Object.fromEntries(
      yColumns.map((column) => {
        const values = group
          .map((row) => row[column])
          .filter((value): value is number => typeof value === 'number');
        if (!values.length) return [column, null];
        const sum = values.reduce((total, value) => total + value, 0);
        const result =
          fn === 'avg'
            ? sum / values.length
            : fn === 'min'
            ? Math.min(...values)
            : fn === 'max'
            ? Math.max(...values)
            : sum;
        return [column, result];
      })
    ),
  }));
};

const getExtentDomain = (extent: Extent | undefined, hasBarOrArea: boolean) => {
  const mode = extent?.mode ?? 'full';
  const fit = (!hasBarOrArea || Boolean(extent?.enforce)) && mode === 'dataBounds';
  const { lowerBound, upperBound } = extent ?? {};
  // Lens's `validateExtent`: bars and areas must include zero.
  const isValid =
    lowerBound != null &&
    upperBound != null &&
    upperBound > lowerBound &&
    (!hasBarOrArea || (lowerBound <= 0 && upperBound >= 0));
  const isCustom = mode === 'custom' && (isValid || Boolean(extent?.enforce));
  return {
    fit,
    min: isCustom ? lowerBound ?? NaN : NaN,
    max: isCustom ? upperBound ?? NaN : NaN,
  };
};

// Lens's `getBaseIconPlacement` for a vertical chart.
const getBaseIconPlacement = (
  iconPosition: string | undefined,
  axes: Record<AxisSide, YAxisGroup | undefined>,
  position: Position
): Position => {
  if (iconPosition === 'auto') {
    if (position === Position.Bottom) return Position.Top;
    if (position === Position.Left) return axes.right ? Position.Left : Position.Right;
    return axes.left ? Position.Right : Position.Left;
  }
  if (iconPosition === 'left') return Position.Left;
  if (iconPosition === 'right') return Position.Right;
  if (iconPosition === 'below') return Position.Bottom;
  return Position.Top;
};

const ROTATED_POSITIONS: Record<Position, Position> = {
  [Position.Bottom]: Position.Left,
  [Position.Right]: Position.Bottom,
  [Position.Top]: Position.Right,
  [Position.Left]: Position.Top,
};
const getOriginalAxisPosition = (position: Position, isRotated: boolean) =>
  isRotated ? ROTATED_POSITIONS[position] : position;
// Lens's `mapVerticalToHorizontalPlacement`.
const HORIZONTAL_PLACEMENTS: Record<Position, Position> = {
  [Position.Top]: Position.Right,
  [Position.Bottom]: Position.Left,
  [Position.Left]: Position.Bottom,
  [Position.Right]: Position.Top,
};

const getDash = (lineStyle: string | undefined, width: number) =>
  lineStyle === 'dashed' ? [width * 3, width] : lineStyle === 'dotted' ? [width, width] : undefined;

// Lens's area gradient: opacity stops eased with `easing.inOutSine`.
const getAreaGradient = (isStackedWithBreakdown: boolean): LinearGradient => {
  const defaultOpacityCorrection = 0.3;
  const startOpacity = (isStackedWithBreakdown ? 0.1 : 0.05) / defaultOpacityCorrection;
  const endOpacity = 0.4 / defaultOpacityCorrection;
  const stopCount = 12;
  return {
    type: 'linear',
    stops: Array.from({ length: stopCount }, (_, index) => {
      const progress = index / (stopCount - 1);
      const eased = -(Math.cos(Math.PI * progress) - 1) / 2;
      return {
        offset: progress,
        opacity: startOpacity + (endOpacity - startOpacity) * eased,
        color: ColorVariant.Series,
      };
    }),
  };
};

const toTimestamp = (value: string | number) =>
  typeof value === 'number' ? value : moment(value).valueOf();

/**
 * Draws a Lens XY chart (ES|QL) with Elastic Charts' headless renderer, the way `XYChart` draws
 * the expression Lens builds for it: the API config goes through Lens's own API -> state
 * transform, then follows `toExpression` and the expression's chart component (series, axes,
 * domains, colors, legend, reference lines and annotations).
 */
const renderXyPreviewSvg = (
  config: XyPreviewConfig,
  table: PreviewTable,
  { timeZone, dateFormat, timeRange, extraTables }: PreviewContext
): string => {
  const state = new LensConfigBuilder().fromAPIFormat(config).state
    .visualization as XYPersistedState;
  const apiDataLayers = config.layers.filter(isDataLayer);
  const stateDataLayers = state.layers.filter(isStateDataLayer);
  if (!apiDataLayers.length || apiDataLayers.length !== stateDataLayers.length) {
    throw new Error('The panel has no XY data layer');
  }
  const tablesByQuery = new Map<string | undefined, PreviewTable>([
    ...Object.entries(extraTables),
    [getDataLayerQuery(apiDataLayers[0]), table],
  ]);

  const layers: DataLayer[] = apiDataLayers.flatMap((api, index): DataLayer[] => {
    const stateLayer = stateDataLayers[index];
    const layerTable = tablesByQuery.get(getDataLayerQuery(api));
    if (!layerTable || !api.y.length) return [];
    const missing = [api.x, ...api.y, api.breakdown_by].find(
      (column) => column && getColumnType(layerTable, column.column) === undefined
    );
    if (missing) {
      throw new Error(`The ES|QL result has no "${missing.column}" column`);
    }
    const [kind] = stateLayer.seriesType.split('_') as [SeriesKind];
    const xType = api.x ? getColumnType(layerTable, api.x.column) ?? 'keyword' : 'keyword';
    const isTime = DATE_TYPES.has(xType);
    const yColumns = api.y.map(({ column }) => column);
    const collapseFn = stateLayer.collapseFn;
    const rows = toRows(layerTable).filter((row) => !api.x || row[api.x.column] !== undefined);
    const splitColumn = collapseFn ? undefined : api.breakdown_by?.column;
    const paletteId =
      stateLayer.palette && !collapseFn
        ? stateLayer.palette.name
        : kind === 'line'
        ? 'elastic_line_optimized'
        : 'default';
    return [
      {
        state: stateLayer,
        api,
        kind: SERIES_BY_KIND[kind] ? kind : 'line',
        isStacked: stateLayer.seriesType.includes('stacked'),
        isPercentage: stateLayer.seriesType.includes('percentage'),
        isHorizontal: stateLayer.seriesType.includes('horizontal'),
        // ES|QL date columns are bucketed intervals, numbers are not (`operationFromDataType`).
        isHistogram: isTime,
        isTime,
        xScaleType: isTime
          ? ScaleType.Time
          : NUMBER_TYPES.has(xType)
          ? ScaleType.Linear
          : ScaleType.Ordinal,
        rows: collapseFn ? collapseRows(rows, api.x?.column, yColumns, collapseFn) : rows,
        splitColumn,
        paletteId,
        colorMapping: splitColumn
          ? stateLayer.colorMapping ??
            (stateLayer.palette
              ? undefined
              : {
                  ...DEFAULT_COLOR_MAPPING_CONFIG,
                  paletteId: paletteId as ColorMapping.Config['paletteId'],
                })
          : undefined,
      },
    ];
  });
  if (!layers.length) {
    throw new Error('The panel has no XY data layer with y columns in its ES|QL result');
  }

  const [firstLayer] = layers;
  const isRotated = layers.every(({ isHorizontal }) => isHorizontal);
  const isTimeChart = layers.every(({ isTime, api }) => isTime && api.x);
  const isHistogramChart = layers.every(({ isHistogram }) => isHistogram);
  const barLayers = layers.filter(({ kind }) => kind === 'bar');
  const hasBars = barLayers.length > 0;
  const countSeries = (subset: DataLayer[]) =>
    subset.length > 1 ||
    subset.some(({ api }) => api.y.length > 1) ||
    subset.some(({ splitColumn }) => splitColumn !== undefined);
  const referenceLayers = config.layers.filter(isReferenceLineLayer);
  const hasManySeries = countSeries(layers) || layers.length + referenceLayers.length > 1;
  const hasManyBarSeries = countSeries(barLayers);
  const multipleLayersWithSplits = layers.filter(({ splitColumn }) => splitColumn).length > 1;
  const isCategoricalX = layers.every(
    ({ api, xScaleType }) => !api.x || xScaleType === ScaleType.Ordinal
  );
  const isHorizontalTimeAxis =
    isTimeChart &&
    !isRotated &&
    layers.some(
      ({ isHistogram, kind, isStacked }) =>
        isHistogram && (isStacked || kind !== 'bar' || !hasManyBarSeries)
    );

  // Date histograms span the time range in full buckets; partial buckets are dropped.
  const xColumn = firstLayer.api.x;
  const interval =
    isTimeChart && xColumn
      ? getBucketInterval(
          tablesByQuery.get(getDataLayerQuery(firstLayer.api)) ?? table,
          xColumn.column,
          firstLayer.rows.map((row) => Number(row[xColumn.column]))
        )
      : undefined;
  let computedDomain: { min: number; max: number } | undefined;
  if (isTimeChart && interval && timeRange) {
    const from = moment.tz(timeRange.min, timeZone);
    const to = moment.tz(timeRange.max, timeZone);
    layers.forEach((layer) => {
      const column = layer.api.x?.column ?? '';
      const anchor = Number(layer.rows[0]?.[column] ?? timeRange.min);
      const bounds = getDomainBounds(from, to, anchor, interval, timeZone);
      if (bounds) {
        computedDomain = {
          min: Math.min(bounds.min, computedDomain?.min ?? Infinity),
          max: Math.max(bounds.max, computedDomain?.max ?? -Infinity),
        };
      }
      layer.rows = layer.rows.filter((row) =>
        isFullyContained(moment.tz(Number(row[column]), timeZone), from, to, interval)
      );
    });
  }
  // Lens's `EmptyPlaceholder`, with the icon of the first layer's series type.
  if (layers.every(({ rows }) => rows.length === 0)) {
    return framePreviewSvg(
      config.title,
      emptyPlaceholderSvg({
        icon: SERIES_TYPE_ICONS[firstLayer.state.seriesType] ?? IconChartBar,
        width: PREVIEW_WIDTH,
        height: PREVIEW_CHART_HEIGHT,
      })
    );
  }
  const xValues = [
    ...new Set(
      layers.flatMap(({ api: { x }, rows }) => (x ? rows.map((row) => Number(row[x.column])) : []))
    ),
  ].sort((a, b) => a - b);
  const minInterval = interval
    ? CALENDAR_UNITS.includes(interval.unit) && xValues.length > 1
      ? Math.min(...xValues.slice(1).map((value, index) => value - xValues[index]))
      : moment.duration(interval.value, interval.unit).asMilliseconds()
    : undefined;
  const xDomain: DomainRange | undefined = !isTimeChart
    ? undefined
    : computedDomain && minInterval
    ? {
        min: computedDomain.min,
        max: hasBars ? computedDomain.max : computedDomain.max + minInterval,
        minInterval,
      }
    : { min: timeRange?.min ?? NaN, max: timeRange?.max ?? NaN, minInterval };

  // Axes (`getAxesConfiguration`): metrics go to the left (y) or right (y2) axis group.
  const axisSideOf = (layer: DataLayer, index: number): AxisSide =>
    layer.state.yConfig?.find(({ forAccessor }) => forAccessor === layer.state.accessors[index])
      ?.axisMode === 'right'
      ? 'right'
      : 'left';
  const yAxes = (['left', 'right'] as const).flatMap((side): YAxisGroup[] => {
    const series = layers.flatMap((layer) =>
      layer.api.y.flatMap((column, index) =>
        axisSideOf(layer, index) === side ? [{ layer, column }] : []
      )
    );
    if (!series.length) return [];
    const [{ layer, column }] = series;
    const position =
      side === 'left'
        ? isRotated
          ? Position.Bottom
          : Position.Left
        : isRotated
        ? Position.Top
        : Position.Right;
    return [
      {
        side,
        groupId: `axis-${side}`,
        position,
        series,
        format: layer.isPercentage
          ? (value: number) => numeral(value).format(PERCENT_PATTERN)
          : getValueFormatter(column.format as ValueFormat | undefined),
      },
    ];
  });
  const axesBySide = {
    left: yAxes.find(({ side }) => side === 'left'),
    right: yAxes.find(({ side }) => side === 'right'),
  };
  const axisSettings = (side: 'x' | 'yLeft' | 'yRight') => ({
    showTitle: state.axisTitlesVisibilitySettings?.[side] ?? true,
    showLabels: state.tickLabelsVisibilitySettings?.[side] ?? true,
    showGridLines: state.gridlinesVisibilitySettings?.[side] ?? true,
    labelsOrientation: state.labelsOrientation?.[side] ?? 0,
  });
  const xSettings = axisSettings('x');

  // Reference lines (`ReferenceLineLayer`) and annotations, and the paddings their markers take.
  const referenceLines = referenceLayers.flatMap((layer, layerIndex) =>
    layer.thresholds.map((threshold: ApiThreshold, index) => {
      const axis = threshold.axis ?? 'y';
      const side: Position =
        axis === 'x' ? Position.Bottom : axis === 'y2' ? Position.Right : Position.Left;
      const group =
        side === Position.Bottom
          ? undefined
          : (side === Position.Right ? axesBySide.right : axesBySide.left) ??
            yAxes.find(({ position }) => position === (isRotated ? Position.Bottom : side));
      const value = 'value' in threshold ? Number(threshold.value) : NaN;
      return {
        id: `reference_lines_${layerIndex}-threshold${index}`,
        threshold,
        value,
        side,
        group,
        name: threshold.label ?? `Static value: ${value}`,
        color: threshold.color?.type === 'static' ? threshold.color.color : REFERENCE_LINE_COLOR,
        lineWidth: threshold.stroke_width ?? 1,
        fill: threshold.fill ?? 'none',
      };
    })
  );
  const annotationEvents = isTimeChart
    ? config.layers
        .filter(isAnnotationLayer)
        .flatMap(({ events }) => events)
        .filter(({ visible }) => visible !== false)
    : [];
  const linesPaddings: Partial<Record<Position, number>> = {};
  const markerIcons: Partial<Record<Position, number>> = {};
  const addPadding = (placement: Position, hasIcon: boolean, hasText: boolean) => {
    linesPaddings[placement] = Math.max(
      linesPaddings[placement] ?? 0,
      LINES_MARKER_SIZE * (hasText ? 2 : 1)
    );
    markerIcons[placement] = (markerIcons[placement] ?? 0) + (hasIcon ? 1 : 0);
  };
  const getReferenceLinePlacement = ({
    threshold,
    group,
    side,
  }: Pick<(typeof referenceLines)[number], 'threshold' | 'group' | 'side'>) =>
    getBaseIconPlacement(
      threshold.position ?? 'auto',
      axesBySide,
      getOriginalAxisPosition(
        group?.position ?? (side === Position.Bottom ? Position.Bottom : Position.Left),
        isRotated
      )
    );
  referenceLines.forEach((line) => {
    const hasIcon = Boolean(line.threshold.icon);
    const hasText = Boolean(line.threshold.text?.visible);
    if (hasIcon || hasText) addPadding(getReferenceLinePlacement(line), hasIcon, hasText);
  });
  annotationEvents.forEach((event) => {
    if (event.type === 'point') {
      addPadding(Position.Top, true, Boolean(event.text?.visible && event.label));
    }
  });
  (Object.keys(linesPaddings) as Position[]).forEach((placement) => {
    if (!markerIcons[placement]) linesPaddings[placement] = LINES_MARKER_SIZE;
  });

  const toMarkerPosition = (placement: Position) =>
    isRotated ? HORIZONTAL_PLACEMENTS[placement] : placement;

  // `computeChartMargins`: marker paddings next to hidden axes become chart margins.
  const chartMargins = { ...LEGACY_LIGHT_THEME.chartMargins };
  const addMargin = (placement: Position, value: number) => {
    const rotated = toMarkerPosition(placement);
    chartMargins[rotated] = value;
  };
  const yLeft = axisSettings('yLeft');
  const yRight = axisSettings('yRight');
  if (!xSettings.showLabels && !xSettings.showTitle && linesPaddings.bottom) {
    addMargin(Position.Bottom, linesPaddings.bottom);
  }
  if (
    linesPaddings.left &&
    (isRotated || !axesBySide.left || (!yLeft.showLabels && !yLeft.showTitle))
  ) {
    addMargin(Position.Left, linesPaddings.left);
  }
  if (
    linesPaddings.right &&
    (isRotated || !axesBySide.right || (!yRight.showLabels && !yRight.showTitle))
  ) {
    addMargin(Position.Right, linesPaddings.right);
  }
  if (linesPaddings.top) addMargin(Position.Top, linesPaddings.top);

  // Series names and colors (`getSeriesName`, `getColorAssignments`, color mapping).
  const formatSplitValue = (layer: DataLayer, value: unknown): string => {
    if (value === null || value === undefined) return NULL_LABEL;
    const column = layer.api.breakdown_by;
    const type =
      column &&
      getColumnType(tablesByQuery.get(getDataLayerQuery(layer.api)) ?? table, column.column);
    if (type && DATE_TYPES.has(type))
      return moment.tz(value as string, timeZone).format(dateFormat);
    if (typeof value === 'number') {
      return getValueFormatter(column?.format as ValueFormat | undefined)(value);
    }
    return String(value);
  };
  const getSeriesName = (layer: DataLayer, column: ApiColumn, splitValue?: unknown) => {
    const yTitle = getColumnLabel(column);
    if (!layer.splitColumn) return yTitle;
    const splitName = formatSplitValue(layer, splitValue);
    return layer.api.y.length > 1 || multipleLayersWithSplits
      ? `${splitName} - ${yTitle}`
      : splitName;
  };
  const getAllSeriesNames = (layer: DataLayer) => {
    const { splitColumn, rows, api } = layer;
    return [
      ...new Set(
        splitColumn
          ? rows.flatMap((row) =>
              api.y.map((column) => getSeriesName(layer, column, row[splitColumn]))
            )
          : api.y.map((column) => getSeriesName(layer, column))
      ),
    ];
  };
  const palettes = getPreviewPalettes();
  const paletteGroups = new Map<string, Array<{ layer: DataLayer; names: string[] }>>();
  layers.forEach((layer) => {
    paletteGroups.set(layer.paletteId, [
      ...(paletteGroups.get(layer.paletteId) ?? []),
      { layer, names: getAllSeriesNames(layer) },
    ]);
  });
  const getLegacyColor = (layer: DataLayer, name: string) => {
    const group = paletteGroups.get(layer.paletteId) ?? [];
    const layerIndex = group.findIndex((entry) => entry.layer === layer);
    const offset = group
      .slice(0, Math.max(layerIndex, 0))
      .reduce((sum, { names }) => sum + names.length, 0);
    const colors = (palettes.query(layer.paletteId) ?? palettes.get('default')).colors();
    return colors[
      (offset + Math.max(group[layerIndex]?.names.indexOf(name) ?? 0, 0)) % colors.length
    ];
  };
  const getColorAccessor = (
    layer: DataLayer,
    column: ApiColumn,
    index: number
  ): SeriesColorAccessorFn => {
    const staticColor = layer.splitColumn
      ? undefined
      : layer.state.yConfig?.find(
          ({ forAccessor }: YConfig) => forAccessor === layer.state.accessors[index]
        )?.color;
    if (staticColor) return () => staticColor;
    const { splitColumn, colorMapping } = layer;
    if (splitColumn && colorMapping) {
      const categories = [...new Set(layer.rows.map((row) => row[splitColumn]))].filter(
        (value): value is string | number => typeof value === 'string' || typeof value === 'number'
      );
      const getColor = getColorFactory(colorMapping, palettes, false, {
        type: 'categories',
        categories: [
          ...categories,
          ...(layer.rows.some((row) => row[splitColumn] === null) ? [null] : []),
        ],
      });
      return ({ splitAccessors }: XYChartSeriesIdentifier) => {
        const value = splitAccessors.get(splitColumn);
        return value === undefined ? null : getColor(value);
      };
    }
    return (series: XYChartSeriesIdentifier) =>
      getLegacyColor(
        layer,
        getSeriesName(layer, column, series.splitAccessors.get(splitColumn ?? ''))
      );
  };

  // Settings (`XYChart`): legend, theme overrides and the x domain.
  const { legend } = state;
  const showLegend =
    legend.isVisible && !legend.showSingleSeries ? hasManySeries : legend.isVisible;
  const isOutsideHorizontal =
    !legend.isInside && (legend.position === Position.Top || legend.position === Position.Bottom);
  const legendPosition: Position | LegendPositionConfig = legend.isInside
    ? {
        vAlign: legend.verticalAlignment ?? VerticalAlignment.Top,
        hAlign: legend.horizontalAlignment ?? HorizontalAlignment.Right,
        direction: LayoutDirection.Vertical,
        floating: true,
        floatingColumns: Math.min(5, legend.floatingColumns ?? 1),
      }
    : legend.position;
  const shouldTruncate = legend.shouldTruncate ?? true;
  const legendTitle = legend.isTitleVisible
    ? legend.title ||
      (firstLayer.splitColumn && firstLayer.api.breakdown_by
        ? getColumnLabel(firstLayer.api.breakdown_by)
        : DEFAULT_LEGEND_TITLE)
    : undefined;
  const showValueLabels = (state.valueLabels ?? 'hide') !== 'hide';
  const categoricalXCount = isCategoricalX
    ? new Set(
        layers.flatMap(({ api: { x }, rows }) => (x ? rows.map((row) => row[x.column]) : ['']))
      ).size
    : 0;
  const theme: PartialTheme = {
    chartMargins,
    legend: {
      labelOptions: shouldTruncate
        ? { maxLines: legend.maxLines ?? 1, widthLimit: LEGEND_TRUNCATE_WIDTH_LIMIT }
        : { maxLines: 0, widthLimit: 0 },
    },
    barSeriesStyle: {
      ...(showValueLabels
        ? {
            displayValue: {
              fontSize: { min: 10, max: 12 },
              fill: { textBorder: 0 },
              alignment: isRotated
                ? { vertical: VerticalAlignment.Middle }
                : { horizontal: HorizontalAlignment.Center },
              offsetX: isRotated ? 10 : 0,
              offsetY: isRotated ? 0 : -10,
            },
          }
        : {}),
      // A safeguard against overly thick bars on sparse charts.
      ...(hasBars && isCategoricalX
        ? {
            rect: {
              widthPixel: 400,
              ...(categoricalXCount && categoricalXCount <= 2
                ? { widthRatio: Math.min(1, 0.1 + 0.4 * categoricalXCount) }
                : {}),
            },
          }
        : {}),
    },
  };

  // The x axis (`xAxisStyle`): a multilayer time axis, or labels that wrap and truncate.
  const xFormat = isTimeChart
    ? (value: number) => moment.tz(value, timeZone).format(dateFormat)
    : firstLayer.xScaleType === ScaleType.Linear
    ? getValueFormatter(xColumn?.format as ValueFormat | undefined)
    : (value: unknown) => (value === null || value === undefined ? NULL_LABEL : String(value));
  const xAxisStyle: RecursivePartial<AxisStyle> = isHorizontalTimeAxis
    ? {
        tickLabel: { visible: xSettings.showLabels },
        axisTitle: { visible: xSettings.showTitle },
        tickLine: { visible: xSettings.showLabels },
      }
    : {
        tickLabel: {
          visible: xSettings.showLabels,
          rotation: xSettings.labelsOrientation,
          padding: linesPaddings.bottom != null ? { inner: linesPaddings.bottom } : undefined,
          ...(isCategoricalX
            ? { truncate: 'middle', wrapLines: 2, ...(isRotated ? {} : { minLength: 80 }) }
            : {}),
        },
        axisTitle: {
          visible: xSettings.showTitle,
          padding:
            !xSettings.showLabels && linesPaddings.bottom != null
              ? { inner: linesPaddings.bottom }
              : undefined,
        },
        ...(isCategoricalX ? { maxExtent: '50%' } : {}),
      };
  const getYAxisStyle = ({ side, position }: YAxisGroup): RecursivePartial<AxisStyle> => {
    const { showLabels, showTitle, labelsOrientation } = side === 'left' ? yLeft : yRight;
    const padding = linesPaddings[getOriginalAxisPosition(position, isRotated)];
    return {
      tickLabel: {
        visible: showLabels,
        rotation: labelsOrientation,
        padding: padding != null ? { inner: padding } : undefined,
      },
      axisTitle: {
        visible: showTitle,
        padding: !showLabels && padding != null ? { inner: padding } : undefined,
      },
    };
  };
  const getYAxisDomain = (axis: YAxisGroup) => {
    const extent = axis.side === 'left' ? state.yLeftExtent : state.yRightExtent;
    const hasBarOrArea = axis.series.some(({ layer }) => layer.kind !== 'line');
    return {
      ...getExtentDomain(extent, hasBarOrArea),
      includeDataFromIds: referenceLines
        .filter(({ group }) => group === axis)
        .map(({ id, fill }) => `${id}-${fill !== 'none' ? 'rect' : 'line'}`),
    };
  };
  const xNice = Boolean(state.xExtent?.niceValues);

  // Series (`DataLayers`, `getSeriesProps`).
  const fittingFunction = state.fittingFunction ?? 'Linear';
  const endValue = state.endValue ?? 'None';
  const fit = {
    type: Fit[fittingFunction],
    endValue: endValue === 'Nearest' ? Fit.Nearest : endValue === 'Zero' ? 0 : undefined,
  };
  const emphasizeFitting = state.emphasizeFitting ?? true;
  const fillOpacity = state.fillOpacity ?? 0.3;
  const areaFill = state.areaFill ?? 'gradient';
  const pointVisibility = state.pointVisibility ?? 'auto';
  const curve = CurveType[state.curveType ?? 'LINEAR'];
  const fitLine = { visible: true, stroke: ColorVariant.Series, opacity: 1, dash: [] };
  const series = layers.flatMap((layer) =>
    layer.api.y.map((column, index) => {
      const { kind, splitColumn, isStacked, isPercentage, api, state: stateLayer } = layer;
      const axis = yAxes.find(({ series: axisSeries }) =>
        axisSeries.some((entry) => entry.layer === layer && entry.column === column)
      );
      const yScale = (axis?.side === 'right' ? state.yRightScale : state.yLeftScale) ?? 'linear';
      const yExtent = axis?.side === 'right' ? state.yRightExtent : state.yLeftExtent;
      const yScaleType =
        yScale === 'log' ? ScaleType.Log : yScale === 'sqrt' ? ScaleType.Sqrt : ScaleType.Linear;
      const isBytes = (column.format as ValueFormat | undefined)?.type === 'bytes';
      const point = { visible: pointVisibility } as const;
      const areaStyle: Partial<AreaSeriesStyle['area']> = {
        opacity: fillOpacity,
        ...(areaFill === 'gradient' && fillOpacity > 0
          ? { gradient: getAreaGradient(isStacked && Boolean(splitColumn)) }
          : {}),
      };
      const Series = SERIES_BY_KIND[kind];
      const xAccessor = api.x?.column ?? 'unifiedX';
      return (
        <Series
          key={`${stateLayer.layerId}-${index}`}
          id={`${stateLayer.layerId}-${column.column}-${index}`}
          groupId={axis?.groupId}
          name={(identifier: XYChartSeriesIdentifier) =>
            getSeriesName(
              layer,
              column,
              splitColumn ? identifier.splitAccessors.get(splitColumn) : undefined
            )
          }
          data={api.x ? layer.rows : layer.rows.map((row) => ({ ...row, unifiedX: '' }))}
          xScaleType={api.x ? layer.xScaleType : ScaleType.Ordinal}
          yScaleType={
            isBytes && yScaleType === ScaleType.Linear ? ScaleType.LinearBinary : yScaleType
          }
          xAccessor={xAccessor}
          yAccessors={[column.column]}
          splitSeriesAccessors={splitColumn ? [splitColumn] : []}
          stackAccessors={isStacked ? [xAccessor] : []}
          stackMode={isPercentage ? StackMode.Percentage : undefined}
          enableHistogramMode={
            layer.isHistogram &&
            (isStacked || !splitColumn) &&
            (isStacked || kind !== 'bar' || !hasManyBarSeries)
          }
          timeZone={timeZone}
          color={getColorAccessor(layer, column, index)}
          yNice={Boolean((yExtent ?? { niceValues: true }).niceValues)}
          xNice={xNice}
          areaSeriesStyle={{
            point,
            area: areaStyle,
            ...(emphasizeFitting
              ? { fit: { area: { opacity: fillOpacity || 0.5 }, line: fitLine } }
              : {}),
          }}
          lineSeriesStyle={{ point, ...(emphasizeFitting ? { fit: { line: fitLine } } : {}) }}
          {...(kind === 'bar'
            ? {
                minBarHeight: state.minBarHeight ?? 1,
                displayValueSettings: {
                  valueFormatter: (value: unknown) =>
                    typeof value === 'number' ? axis?.format(value) ?? String(value) : '',
                  showValueLabel: showValueLabels,
                  isAlternatingValueLabel: false,
                  overflowConstraints: [
                    LabelOverflowConstraint.ChartEdges,
                    LabelOverflowConstraint.BarGeometry,
                  ],
                },
              }
            : { curve, fit: kind === 'area' && isPercentage ? Fit.Zero : fit })}
        />
      );
    })
  );

  // Reference line specs (`ReferenceLineAnnotations`): a line, and a band to the next line.
  const referenceLineSpecs = referenceLines.flatMap((line) => {
    const { id, value, group, color, lineWidth, fill, threshold } = line;
    if (!Number.isFinite(value)) return [];
    const groupId = group?.groupId ?? 'bottom';
    const isXDomain = groupId === 'bottom';
    const sharedStyle = {
      strokeWidth: lineWidth,
      stroke: color,
      dash: getDash(threshold.stroke_dash, lineWidth),
    };
    const sameDirection = referenceLines
      .filter(
        (other) => other.fill === fill && other.group === group && Number.isFinite(other.value)
      )
      .sort((a, b) => (fill === 'below' ? b.value - a.value : a.value - b.value));
    const nextValue = sameDirection[sameDirection.indexOf(line) + 1]?.value;
    const isAbove = fill === 'above';
    const [from, to] = isAbove ? [value, nextValue] : [nextValue, value];
    return [
      <LineAnnotation
        key={`${id}-line`}
        id={`${id}-line`}
        groupId={isXDomain ? undefined : groupId}
        domainType={isXDomain ? AnnotationDomainType.XDomain : AnnotationDomainType.YDomain}
        dataValues={[{ dataValue: value, header: line.name }]}
        // Only text markers can be drawn without a DOM; Lens's marker icons are left out.
        marker={threshold.text?.visible ? line.name : undefined}
        markerPosition={toMarkerPosition(getReferenceLinePlacement(line))}
        style={{ line: { ...sharedStyle, opacity: 1 } }}
      />,
      ...(fill !== 'none'
        ? [
            <RectAnnotation
              key={`${id}-rect`}
              id={`${id}-rect`}
              groupId={isXDomain ? undefined : groupId}
              dataValues={[
                {
                  coordinates: isXDomain
                    ? { x0: from, x1: to, y0: undefined, y1: undefined }
                    : { x0: undefined, x1: undefined, y0: from, y1: to },
                },
              ]}
              style={{ ...sharedStyle, fill: color, opacity: 0.1 }}
            />,
          ]
        : []),
    ];
  });

  // Manual annotations (`Annotations`): event lines and ranges on time charts.
  const annotationSpecs = annotationEvents.map((event, index) => {
    const color = event.color?.type === 'static' ? event.color.color : undefined;
    if (event.type === 'range') {
      return (
        <RectAnnotation
          key={`annotation-${index}`}
          id={`annotation-${index}`}
          dataValues={[
            {
              coordinates: {
                x0: toTimestamp(event.interval.from),
                x1: toTimestamp(event.interval.to),
              },
              details: event.label,
            },
          ]}
          style={{ fill: color ?? ANNOTATION_RANGE_COLOR, opacity: 1 }}
          outside={event.fill === 'outside'}
          outsideDimension={
            isHorizontalTimeAxis ? 4 + 10 : Math.max(10, OUTSIDE_RECT_ANNOTATION_WIDTH)
          }
        />
      );
    }
    const strokeWidth = event.line?.stroke_width ?? 1;
    const style: RecursivePartial<LineAnnotationStyle> = {
      line: {
        strokeWidth,
        stroke: color ?? ANNOTATION_COLOR,
        dash: getDash(event.line?.stroke_dash, strokeWidth),
        opacity: 1,
      },
    };
    return (
      <LineAnnotation
        key={`annotation-${index}`}
        id={`annotation-${index}`}
        domainType={AnnotationDomainType.XDomain}
        dataValues={[{ dataValue: toTimestamp(event.timestamp), details: event.label }]}
        marker={event.text?.visible ? event.label : undefined}
        markerPosition={toMarkerPosition(Position.Top)}
        style={style}
      />
    );
  });

  const xTitle = state.xTitle || (xColumn ? getColumnLabel(xColumn) : undefined);
  const legendSize =
    legend.isInside || isOutsideHorizontal ? undefined : LEGEND_SIZES[legend.legendSize ?? 'auto'];

  return renderChartPreviewSvg(
    config.title,
    <>
      <Settings
        rotation={isRotated ? 90 : 0}
        showLegend={showLegend}
        legendPosition={legendPosition}
        legendLayout={isOutsideHorizontal && legend.layout === 'list' ? 'list' : undefined}
        legendSize={legend.isInside ? LEGEND_SIZES.medium : legendSize}
        legendValues={isHistogramChart ? legend.legendStats ?? [] : []}
        legendTitle={legendTitle}
        theme={theme}
        xDomain={xDomain}
      />
      <Axis
        id="x"
        position={isRotated ? Position.Left : Position.Bottom}
        title={xTitle}
        hide={!xColumn}
        gridLine={{ visible: xSettings.showGridLines, strokeWidth: 1 }}
        tickFormat={(value) => xFormat(value)}
        style={xAxisStyle}
      />
      {yAxes.map((axis) => (
        <Axis
          key={axis.groupId}
          id={axis.groupId}
          groupId={axis.groupId}
          position={axis.position}
          title={
            (axis.side === 'left' ? state.yTitle : state.yRightTitle) ||
            getColumnLabel(axis.series[0].column)
          }
          gridLine={{
            visible: (axis.side === 'left' ? yLeft : yRight).showGridLines,
          }}
          tickFormat={(value) => axis.format(value)}
          style={getYAxisStyle(axis)}
          domain={getYAxisDomain(axis)}
        />
      ))}
      {series}
      {referenceLineSpecs}
      {annotationSpecs}
      {state.showCurrentTimeMarker && isTimeChart ? (
        <LineAnnotation
          id="__current-time__"
          domainType={AnnotationDomainType.XDomain}
          dataValues={[{ dataValue: Date.now() }]}
          style={{ line: { strokeWidth: 2, stroke: CURRENT_TIME_COLOR, opacity: 0.7 } }}
        />
      ) : null}
    </>
  );
};

/** The queries of the data layers after the first, keyed by their query (one per distinct query). */
const getExtraQueries = (config: XyPreviewConfig): Readonly<Record<string, string>> => {
  const [first, ...rest] = config.layers
    .filter(isDataLayer)
    .map(getDataLayerQuery)
    .filter((query): query is string => query !== undefined);
  return Object.fromEntries(rest.filter((query) => query !== first).map((query) => [query, query]));
};

export const xyPreviewRenderer: PanelPreviewRenderer<XyPreviewConfig> = {
  getQuery: (config) => {
    const layer = config.layers.find(isDataLayer);
    return layer ? getDataLayerQuery(layer) : undefined;
  },
  getExtraQueries,
  renderSvg: renderXyPreviewSvg,
};
