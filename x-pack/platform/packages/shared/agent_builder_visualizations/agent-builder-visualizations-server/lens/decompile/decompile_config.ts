/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ChartIntent } from '../intent';
import { isRecord } from '../is_record';
import { isSupportedChartType } from '../compile/chart_schemas';
import type { IntentUnit } from '../compile/formats';
import type { SlotBindings, XScale, XyLayerType } from '../binder/bind_slots';

export interface DecompileSuccess {
  chartType: SupportedChartType;
  query?: string;
  bindings: SlotBindings;
  intent: ChartIntent;
  overrides: Record<string, unknown>;
}

export type DecompileResult = DecompileSuccess | { error: string };

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const columnOf = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.column === 'string' ? value.column : undefined;

const columnsOf = (value: unknown): string[] =>
  asRecords(value)
    .map(columnOf)
    .filter((name): name is string => name !== undefined);

const firstEsqlQuery = (config: Record<string, unknown>): string | undefined => {
  const carriers = Array.isArray(config.layers) ? config.layers : [config];
  for (const carrier of carriers) {
    if (!isRecord(carrier) || !isRecord(carrier.data_source)) {
      continue;
    }
    if (carrier.data_source.type === 'esql' && typeof carrier.data_source.query === 'string') {
      return carrier.data_source.query;
    }
  }
  return undefined;
};

const stripDataSources = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripDataSources);
  }
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'data_source') {
      continue;
    }
    next[key] = stripDataSources(child);
  }
  return next;
};

const unitFromFormat = (format: unknown): IntentUnit | undefined => {
  if (!isRecord(format) || typeof format.type !== 'string') {
    return undefined;
  }
  switch (format.type) {
    case 'percent':
    case 'bytes':
    case 'bits':
      return format.type;
    case 'duration':
      if (
        format.from === 'ms' ||
        format.from === 's' ||
        format.from === 'us' ||
        format.from === 'ns'
      ) {
        return format.from;
      }
      return undefined;
    default:
      return undefined;
  }
};

const collectUnits = (value: unknown, units: NonNullable<ChartIntent['units']>): void => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectUnits(entry, units));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (typeof value.column === 'string') {
    const unit = unitFromFormat(value.format);
    if (unit) {
      units[value.column] = unit;
    }
  }
  Object.values(value).forEach((child) => collectUnits(child, units));
};

const INTENT_SERIES_TYPES = new Set<XyLayerType>([
  'line',
  'area',
  'bar',
  'bar_stacked',
  'bar_horizontal',
]);

const extractBindings = (
  chartType: SupportedChartType,
  config: Record<string, unknown>
): SlotBindings => {
  const layers = asRecords(config.layers);
  const firstLayer = layers[0];
  const measures: string[] = [];
  const dimensions: string[] = [];

  const pushMeasure = (name: string | undefined): void => {
    if (name && !measures.includes(name)) {
      measures.push(name);
    }
  };
  const pushDimension = (name: string | undefined): void => {
    if (name && !dimensions.includes(name)) {
      dimensions.push(name);
    }
  };

  switch (chartType) {
    case SupportedChartType.Metric: {
      const metrics = asRecords(config.metrics);
      const primary = columnOf(metrics[0]);
      const secondary = columnOf(metrics[1]);
      const breakdown = columnOf(config.breakdown_by);
      pushMeasure(primary);
      pushMeasure(secondary);
      pushDimension(breakdown);
      return {
        chartType,
        measures,
        dimensions,
        primary,
        secondary,
        breakdown,
      };
    }
    case SupportedChartType.Gauge: {
      const metric = isRecord(config.metric) ? config.metric : {};
      const primary = columnOf(metric);
      pushMeasure(primary);
      pushMeasure(columnOf(metric.min));
      pushMeasure(columnOf(metric.max));
      pushMeasure(columnOf(metric.goal));
      return {
        chartType,
        measures,
        dimensions,
        primary,
        gaugeMin: columnOf(metric.min),
        gaugeMax: columnOf(metric.max),
        gaugeGoal: columnOf(metric.goal),
      };
    }
    case SupportedChartType.XY: {
      const y = columnsOf(firstLayer?.y);
      y.forEach(pushMeasure);
      const x = columnOf(firstLayer?.x);
      const breakdown = columnOf(firstLayer?.breakdown_by);
      pushDimension(x);
      pushDimension(breakdown);
      const layerType =
        firstLayer && typeof firstLayer.type === 'string'
          ? (firstLayer.type as XyLayerType)
          : undefined;
      const axis = isRecord(config.axis) ? config.axis : undefined;
      const axisX = axis && isRecord(axis.x) ? axis.x : undefined;
      const xScale = axisX && typeof axisX.scale === 'string' ? (axisX.scale as XScale) : undefined;
      return {
        chartType,
        measures,
        dimensions,
        x,
        y,
        breakdown,
        layerType,
        xScale,
      };
    }
    case SupportedChartType.Heatmap: {
      const primary = columnOf(config.metric);
      const x = columnOf(config.x);
      const yDim = columnOf(config.y);
      pushMeasure(primary);
      pushDimension(x);
      pushDimension(yDim);
      const axis = isRecord(config.axis) ? config.axis : undefined;
      const axisX = axis && isRecord(axis.x) ? axis.x : undefined;
      const xScale = axisX && typeof axisX.scale === 'string' ? (axisX.scale as XScale) : undefined;
      return {
        chartType,
        measures,
        dimensions,
        primary,
        x,
        yDim,
        xScale,
      };
    }
    case SupportedChartType.Tagcloud: {
      const primary = columnOf(config.metric);
      const tagBy = columnOf(config.tag_by);
      pushMeasure(primary);
      pushDimension(tagBy);
      return { chartType, measures, dimensions, primary, tagBy };
    }
    case SupportedChartType.RegionMap: {
      const primary = columnOf(config.metric);
      const region = isRecord(config.region) ? config.region : {};
      const regionColumn = columnOf(region);
      pushMeasure(primary);
      pushDimension(regionColumn);
      const ems =
        isRecord(region.ems) &&
        typeof region.ems.boundaries === 'string' &&
        typeof region.ems.join === 'string'
          ? { boundaries: region.ems.boundaries, join: region.ems.join }
          : undefined;
      return { chartType, measures, dimensions, primary, region: regionColumn, ems };
    }
    case SupportedChartType.Datatable: {
      const metrics = columnsOf(config.metrics);
      const rows = columnsOf(config.rows);
      metrics.forEach(pushMeasure);
      rows.forEach(pushDimension);
      return { chartType, measures, dimensions, metrics, rows };
    }
    case SupportedChartType.Pie:
    case SupportedChartType.Treemap:
    case SupportedChartType.Waffle: {
      const metrics = columnsOf(config.metrics);
      const groupBy = columnsOf(config.group_by);
      metrics.forEach(pushMeasure);
      groupBy.forEach(pushDimension);
      return { chartType, measures, dimensions, metrics, groupBy };
    }
    case SupportedChartType.Mosaic: {
      const primary = columnOf(config.metric);
      const groupBy = columnsOf(config.group_by);
      const groupBreakdownBy = columnsOf(config.group_breakdown_by);
      pushMeasure(primary);
      groupBy.forEach(pushDimension);
      groupBreakdownBy.forEach(pushDimension);
      return { chartType, measures, dimensions, primary, groupBy, groupBreakdownBy };
    }
    default: {
      const exhaustive: never = chartType;
      return { chartType: exhaustive, measures, dimensions };
    }
  }
};

const extractIntent = (config: Record<string, unknown>, bindings: SlotBindings): ChartIntent => {
  const intent: ChartIntent = {};

  if (isRecord(config.legend) && Array.isArray(config.legend.statistics)) {
    intent.legend_statistics = config.legend.statistics as ChartIntent['legend_statistics'];
  }

  const metrics = asRecords(config.metrics);
  const primary = metrics[0];
  if (primary && isRecord(primary.background_chart) && primary.background_chart.type === 'trend') {
    intent.sparkline = true;
  }
  const secondary = metrics[1];
  if (secondary) {
    const compare = isRecord(secondary.compare) ? secondary.compare : undefined;
    intent.secondary = {
      column: columnOf(secondary),
      compare:
        compare?.to === 'primary'
          ? 'previous'
          : compare?.to === 'baseline'
          ? 'baseline'
          : undefined,
    };
  }

  if (isRecord(config.metric)) {
    const gauge: NonNullable<ChartIntent['gauge']> = {};
    const min = columnOf(config.metric.min);
    const max = columnOf(config.metric.max);
    const goal = columnOf(config.metric.goal);
    if (min) {
      gauge.min = min;
    }
    if (max) {
      gauge.max = max;
    }
    if (goal) {
      gauge.goal = goal;
    }
    if (Object.keys(gauge).length > 0) {
      intent.gauge = gauge;
    }
  }

  if (primary && isRecord(primary.summary) && typeof primary.summary.type === 'string') {
    intent.table = {
      ...intent.table,
      summary: primary.summary.type as NonNullable<ChartIntent['table']>['summary'],
    };
  }
  if (isRecord(config.styling) && isRecord(config.styling.sort_by)) {
    const { column_type: columnType, index } = config.styling.sort_by;
    const list = columnType === 'row' ? asRecords(config.rows) : asRecords(config.metrics);
    const name = typeof index === 'number' ? columnOf(list[index]) : undefined;
    if (name) {
      intent.table = { ...intent.table, sort_by: name };
    }
  }

  if (bindings.ems) {
    intent.region = bindings.ems;
  }
  if (bindings.x) {
    intent.x_field = bindings.x;
  }
  if (bindings.breakdown) {
    intent.breakdown_field = bindings.breakdown;
  }
  if (bindings.layerType && INTENT_SERIES_TYPES.has(bindings.layerType)) {
    intent.series_type = bindings.layerType as NonNullable<ChartIntent['series_type']>;
  }

  const units: NonNullable<ChartIntent['units']> = {};
  collectUnits(config, units);
  if (Object.keys(units).length > 0) {
    intent.units = units;
  }

  return intent;
};

export const decompileConfig = (config: Record<string, unknown>): DecompileResult => {
  if (!isSupportedChartType(config.type)) {
    return { error: 'unsupported chart type' };
  }
  const chartType = config.type;
  const bindings = extractBindings(chartType, config);
  const stripped = stripDataSources(config);
  const overrides = isRecord(stripped) ? { ...stripped } : {};
  delete overrides.type;
  return {
    chartType,
    query: firstEsqlQuery(config),
    bindings,
    intent: extractIntent(config, bindings),
    overrides,
  };
};

export const isDecompileSuccess = (result: DecompileResult): result is DecompileSuccess =>
  'bindings' in result;
