/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ChartIntent } from '../intent';
import {
  classifyColumns,
  hintCandidates,
  resolveColumnHint,
  type ClassifiedColumn,
  type ClassifiedColumns,
} from './classify_columns';
import type { ProbedColumn } from '../probe_columns';

export type XScale = 'temporal' | 'ordinal' | 'linear';
export type XyLayerType =
  | 'line'
  | 'area'
  | 'bar'
  | 'bar_stacked'
  | 'bar_horizontal'
  | 'bar_horizontal_stacked'
  | 'bar_percentage'
  | 'area_stacked'
  | 'area_percentage'
  | 'bar_horizontal_percentage';

export interface SlotBindings {
  chartType: SupportedChartType;
  measures: string[];
  dimensions: string[];
  primary?: string;
  secondary?: string;
  breakdown?: string;
  x?: string;
  y?: string[];
  yDim?: string;
  tagBy?: string;
  region?: string;
  ems?: { boundaries: string; join: string };
  groupBy?: string[];
  groupBreakdownBy?: string[];
  rows?: string[];
  metrics?: string[];
  layerType?: XyLayerType;
  xScale?: XScale;
  gaugeMin?: string;
  gaugeMax?: string;
  gaugeGoal?: string;
}

export interface BindOk {
  bindings: SlotBindings;
}
export interface BindAmbiguous {
  ambiguous: string;
  candidates: string[];
}
export interface BindError {
  error: string;
}
export type BindResult = BindOk | BindAmbiguous | BindError;

export const isBindOk = (result: BindResult): result is BindOk => 'bindings' in result;
export const isBindAmbiguous = (result: BindResult): result is BindAmbiguous =>
  'ambiguous' in result;
export const isBindError = (result: BindResult): result is BindError => 'error' in result;

const names = (columns: ClassifiedColumn[]): string[] => columns.map((column) => column.name);

const firstOfKind = (
  columns: ClassifiedColumn[],
  kind: ClassifiedColumn['kind']
): ClassifiedColumn | undefined => columns.find((column) => column.kind === kind);

const scaleFromKind = (kind: ClassifiedColumn['kind'] | undefined): XScale => {
  switch (kind) {
    case 'temporal':
      return 'temporal';
    case 'numeric':
      return 'linear';
    case 'categorical':
    case 'other':
    case undefined:
      return 'ordinal';
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
};

const hintOrAmbiguous = (
  hint: string | undefined,
  classified: ClassifiedColumns
): ClassifiedColumn | BindAmbiguous | undefined => {
  if (!hint) {
    return undefined;
  }
  const resolved = resolveColumnHint(hint, classified);
  if (resolved) {
    return resolved;
  }
  const candidates = hintCandidates(hint, classified);
  if (candidates.length > 1) {
    return { ambiguous: hint, candidates };
  }
  return undefined;
};

const WORLD_COUNTRIES_ISO2 = { boundaries: 'world_countries', join: 'iso2' };

const emsFromName = (columnName: string): { boundaries: string; join: string } | undefined => {
  const lower = columnName.toLowerCase();
  if (lower === 'geo.src' || lower === 'geo.dest' || lower.includes('country_iso_code')) {
    return WORLD_COUNTRIES_ISO2;
  }
  return undefined;
};

const bindMetric = (classified: ClassifiedColumns, intent?: ChartIntent): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'metric needs at least one measure' };
  }
  const secondaryHint = hintOrAmbiguous(intent?.secondary?.column, classified);
  if (secondaryHint && 'ambiguous' in secondaryHint) {
    return secondaryHint;
  }
  if (measures.length > 1 && !secondaryHint) {
    return { ambiguous: 'secondary', candidates: names(measures.slice(1)) };
  }
  if (dimensions.length > 1) {
    return { error: 'metric cannot bind more than one dimension' };
  }
  if (dimensions.length === 1 && dimensions[0].kind === 'temporal') {
    return { error: 'unbucket the query or use xy' };
  }
  const breakdownHint = hintOrAmbiguous(intent?.breakdown_field, classified);
  if (breakdownHint && 'ambiguous' in breakdownHint) {
    return breakdownHint;
  }
  return {
    bindings: {
      chartType: SupportedChartType.Metric,
      measures: names(measures),
      dimensions: names(dimensions),
      primary: measures[0].name,
      secondary: secondaryHint?.name,
      breakdown: breakdownHint?.name ?? (dimensions.length === 1 ? dimensions[0].name : undefined),
    },
  };
};

const bindGauge = (classified: ClassifiedColumns, intent?: ChartIntent): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'gauge needs at least one measure' };
  }
  const min = hintOrAmbiguous(intent?.gauge?.min, classified);
  const max = hintOrAmbiguous(intent?.gauge?.max, classified);
  const goal = hintOrAmbiguous(intent?.gauge?.goal, classified);
  if (min && 'ambiguous' in min) {
    return min;
  }
  if (max && 'ambiguous' in max) {
    return max;
  }
  if (goal && 'ambiguous' in goal) {
    return goal;
  }
  return {
    bindings: {
      chartType: SupportedChartType.Gauge,
      measures: names(measures),
      dimensions: names(dimensions),
      primary: measures[0].name,
      gaugeMin: min?.name,
      gaugeMax: max?.name,
      gaugeGoal: goal?.name,
    },
  };
};

const layerTypeFromIntent = (
  intent: ChartIntent | undefined,
  xKind: ClassifiedColumn['kind'] | undefined,
  hasBreakdown: boolean
): XyLayerType => {
  if (intent?.series_type) {
    return intent.series_type;
  }
  if (xKind === 'temporal') {
    return 'line';
  }
  if (hasBreakdown) {
    return 'bar_stacked';
  }
  return 'bar';
};

const bindXy = (classified: ClassifiedColumns, intent?: ChartIntent): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'xy needs at least one y measure' };
  }
  const xHint = hintOrAmbiguous(intent?.x_field, classified);
  if (xHint && 'ambiguous' in xHint) {
    return xHint;
  }
  const x =
    xHint ??
    firstOfKind(dimensions, 'temporal') ??
    firstOfKind(dimensions, 'categorical') ??
    firstOfKind(dimensions, 'numeric') ??
    dimensions[0];
  const remaining = dimensions.filter((dimension) => dimension.name !== x?.name);
  const breakdownHint = hintOrAmbiguous(intent?.breakdown_field, classified);
  if (breakdownHint && 'ambiguous' in breakdownHint) {
    return breakdownHint;
  }
  if (!breakdownHint && remaining.length > 1) {
    return { ambiguous: 'breakdown', candidates: names(remaining) };
  }
  const breakdown = breakdownHint ?? remaining[0];
  const xKind = x?.kind;
  return {
    bindings: {
      chartType: SupportedChartType.XY,
      measures: names(measures),
      dimensions: names(dimensions),
      x: x?.name,
      y: names(measures),
      breakdown: breakdown?.name,
      layerType: layerTypeFromIntent(intent, xKind, Boolean(breakdown)),
      xScale: scaleFromKind(xKind),
    },
  };
};

const bindHeatmap = (classified: ClassifiedColumns, intent?: ChartIntent): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'heatmap needs a measure' };
  }
  const xHint = hintOrAmbiguous(intent?.x_field, classified);
  if (xHint && 'ambiguous' in xHint) {
    return xHint;
  }
  const numericDims = dimensions.filter((dimension) => dimension.kind === 'numeric');
  if (!xHint && numericDims.length >= 2) {
    return { ambiguous: 'x', candidates: names(numericDims) };
  }
  const x = xHint ?? firstOfKind(dimensions, 'temporal') ?? dimensions[0];
  const y = dimensions.find((dimension) => dimension.name !== x?.name);
  const xKind = x?.kind === 'numeric' ? 'ordinal' : scaleFromKind(x?.kind);
  return {
    bindings: {
      chartType: SupportedChartType.Heatmap,
      measures: names(measures),
      dimensions: names(dimensions),
      primary: measures[0].name,
      x: x?.name,
      yDim: y?.name,
      xScale: xKind,
    },
  };
};

const bindTagCloud = (classified: ClassifiedColumns): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'tag_cloud needs a measure' };
  }
  if (dimensions.length !== 1) {
    return { error: 'tag_cloud needs exactly one dimension' };
  }
  if (dimensions[0].kind !== 'categorical') {
    return { error: 'tag_cloud tag_by must be categorical' };
  }
  return {
    bindings: {
      chartType: SupportedChartType.Tagcloud,
      measures: names(measures),
      dimensions: names(dimensions),
      primary: measures[0].name,
      tagBy: dimensions[0].name,
    },
  };
};

const bindRegionMap = (classified: ClassifiedColumns, intent?: ChartIntent): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'region_map needs a measure' };
  }
  const region = firstOfKind(dimensions, 'categorical') ?? dimensions[0];
  const ems = intent?.region ?? (region ? emsFromName(region.name) : undefined);
  if (!ems) {
    return { ambiguous: 'ems', candidates: names(dimensions) };
  }
  return {
    bindings: {
      chartType: SupportedChartType.RegionMap,
      measures: names(measures),
      dimensions: names(dimensions),
      primary: measures[0].name,
      region: region?.name,
      ems,
    },
  };
};

const bindDataTable = (classified: ClassifiedColumns, intent?: ChartIntent): BindResult => {
  const hidden = new Set(intent?.table?.hidden ?? []);
  const visible = classified.columns.filter((column) => !hidden.has(column.name));
  const metrics = visible.filter((column) => column.kind === 'numeric');
  const rows = visible.filter((column) => column.kind !== 'numeric');
  return {
    bindings: {
      chartType: SupportedChartType.Datatable,
      measures: names(classified.measures),
      dimensions: names(classified.dimensions),
      metrics: names(metrics),
      rows: names(rows),
    },
  };
};

const PARTITION_DIM_CAP: Partial<Record<SupportedChartType, number>> = {
  [SupportedChartType.Pie]: 3,
  [SupportedChartType.Treemap]: 2,
  [SupportedChartType.Waffle]: 1,
};

const bindPartition = (
  chartType: SupportedChartType,
  classified: ClassifiedColumns,
  intent?: ChartIntent
): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: `${chartType} needs a measure` };
  }
  if (dimensions.some((dimension) => dimension.kind === 'temporal')) {
    return { error: `${chartType} cannot bind a temporal dimension` };
  }
  const breakdownHint = hintOrAmbiguous(intent?.breakdown_field, classified);
  if (breakdownHint && 'ambiguous' in breakdownHint) {
    return breakdownHint;
  }
  const categorical = dimensions.filter((dimension) => dimension.kind === 'categorical');
  const cap = PARTITION_DIM_CAP[chartType] ?? categorical.length;
  const remainder = breakdownHint
    ? categorical.filter((dimension) => dimension.name !== breakdownHint.name)
    : categorical;
  const ordered = breakdownHint ? [breakdownHint, ...remainder] : categorical;
  if (!breakdownHint && categorical.length > cap) {
    return { ambiguous: 'collapse', candidates: names(categorical) };
  }
  return {
    bindings: {
      chartType,
      measures: names(measures),
      dimensions: names(dimensions),
      metrics: [measures[0].name],
      groupBy: names(ordered.slice(0, cap)),
    },
  };
};

const bindMosaic = (classified: ClassifiedColumns): BindResult => {
  const { measures, dimensions } = classified;
  if (measures.length === 0) {
    return { error: 'mosaic needs a measure' };
  }
  if (dimensions.length !== 2) {
    return { error: 'mosaic needs exactly two dimensions' };
  }
  return {
    bindings: {
      chartType: SupportedChartType.Mosaic,
      measures: names(measures),
      dimensions: names(dimensions),
      primary: measures[0].name,
      groupBy: [dimensions[0].name],
      groupBreakdownBy: [dimensions[1].name],
    },
  };
};

export const bindSlots = (
  chartType: SupportedChartType,
  query: string,
  probed: ProbedColumn[],
  intent?: ChartIntent
): BindResult => {
  const classified = classifyColumns(query, probed);
  switch (chartType) {
    case SupportedChartType.Metric:
      return bindMetric(classified, intent);
    case SupportedChartType.Gauge:
      return bindGauge(classified, intent);
    case SupportedChartType.XY:
      return bindXy(classified, intent);
    case SupportedChartType.Heatmap:
      return bindHeatmap(classified, intent);
    case SupportedChartType.Tagcloud:
      return bindTagCloud(classified);
    case SupportedChartType.RegionMap:
      return bindRegionMap(classified, intent);
    case SupportedChartType.Datatable:
      return bindDataTable(classified, intent);
    case SupportedChartType.Pie:
    case SupportedChartType.Treemap:
    case SupportedChartType.Waffle:
      return bindPartition(chartType, classified, intent);
    case SupportedChartType.Mosaic:
      return bindMosaic(classified);
    default: {
      const exhaustive: never = chartType;
      return { error: `unsupported chart type ${exhaustive}` };
    }
  }
};
