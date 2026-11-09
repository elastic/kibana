/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { type AggregateQuery, type Filter, type Query, type TimeRange } from '@kbn/es-query';
import {
  MAX_INVESTIGATION_FIELD_CHARS,
  MAX_INVESTIGATION_FILTERS,
  MAX_INVESTIGATION_TEXT_CHARS,
  type InvestigationSeed,
  extractSeedEntities,
  isEsqlQuery,
} from '@kbn/investigation-seed';
import type { ChartInfo, LensApi, LensPublicStart } from '@kbn/lens-plugin/public';
import { apiHasParentApi, apiPublishesPartialUnifiedSearch } from '@kbn/presentation-publishing';

export const MAX_CHART_METRICS = 10;

const XY_VISUALIZATION_TYPE = 'lnsXY';

export interface ChartMetricOption {
  id: string;
  label: string;
  operationType: string;
  field?: string;
}

export interface LensChartExtraction {
  seed: InvestigationSeed;
  metrics: ChartMetricOption[];
  metricUnreadable: boolean;
}

const asBoundedField = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INVESTIGATION_FIELD_CHARS) {
    return undefined;
  }
  return trimmed;
};

const asBoundedText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INVESTIGATION_TEXT_CHARS) {
    return undefined;
  }
  return trimmed;
};

const normalizeOperationType = (operationType: string): string => {
  switch (operationType) {
    case 'average':
      return 'avg';
    case 'maximum':
      return 'max';
    case 'minimum':
      return 'min';
    default:
      return operationType;
  }
};

/** Reads metric options, split field, data view, and whether the chart metric is readable from `ChartInfo`. */
export const readChartInfoMetadata = (
  chartInfo: ChartInfo | undefined
): {
  metrics: ChartMetricOption[];
  splitField?: string;
  dataViewId?: string;
  indexPattern?: string;
  query?: Query | AggregateQuery;
  filters: Filter[];
  metricUnreadable: boolean;
} => {
  if (!chartInfo) {
    return { metrics: [], filters: [], metricUnreadable: true };
  }

  const esql = isEsqlQuery(chartInfo.query);
  const xy = chartInfo.visualizationType === XY_VISUALIZATION_TYPE;
  const dataLayer =
    chartInfo.layers.find((layer) => layer.layerType === 'data' && layer.dataView !== undefined) ??
    chartInfo.layers[0];
  const dataViewId = asBoundedField(dataLayer?.dataView?.id);
  const indexPattern = asBoundedText(dataLayer?.dataView?.title);

  if (!xy || esql) {
    return {
      metrics: [],
      ...(dataViewId ? { dataViewId } : {}),
      ...(indexPattern ? { indexPattern } : {}),
      query: chartInfo.query,
      filters: chartInfo.filters ?? [],
      metricUnreadable: true,
    };
  }

  const metrics: ChartMetricOption[] = [];
  let splitField: string | undefined;

  for (const layer of chartInfo.layers) {
    for (const dimension of layer.dimensions) {
      if (dimension.dimensionType === 'breakdown' && !splitField) {
        splitField = asBoundedField(dimension.operation.fields?.[0]);
        continue;
      }
      if (dimension.dimensionType !== 'y' || metrics.length >= MAX_CHART_METRICS) {
        continue;
      }
      const rawType = asBoundedField(dimension.operation.type);
      if (!rawType) {
        continue;
      }
      const operationType = normalizeOperationType(rawType);
      const field = asBoundedField(dimension.operation.fields?.[0]);
      const label =
        asBoundedField(dimension.name) ?? (field ? `${operationType}(${field})` : operationType);
      metrics.push({
        id: dimension.id || `${operationType}:${field ?? metrics.length}`,
        label,
        operationType,
        ...(field ? { field } : {}),
      });
    }
  }

  return {
    metrics,
    ...(splitField ? { splitField } : {}),
    ...(dataViewId ? { dataViewId } : {}),
    ...(indexPattern ? { indexPattern } : {}),
    query: chartInfo.query,
    filters: chartInfo.filters ?? [],
    metricUnreadable: metrics.length === 0,
  };
};

const toSelectionBounds = (
  selectionRange: TimeRange | undefined
): { start: number; end: number } | undefined => {
  if (!selectionRange) {
    return undefined;
  }
  const start = datemath.parse(selectionRange.from)?.valueOf();
  const end = datemath.parse(selectionRange.to)?.valueOf();
  if (
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start
  ) {
    return undefined;
  }
  return { start, end };
};

const nonEmptyQuery = (
  query: Query | AggregateQuery | undefined
): Query | AggregateQuery | undefined => {
  if (!query) {
    return undefined;
  }
  if (isEsqlQuery(query)) {
    return query.esql.trim().length > 0 ? query : undefined;
  }
  if (typeof query.query === 'string') {
    return query.query.trim().length > 0 ? query : undefined;
  }
  return query;
};

/** Builds an `InvestigationSeed` and chart metadata from a Lens embeddable and optional brushed/clicked event. */
export const extractLensChartSeed = async ({
  embeddable,
  lens,
  origin,
  eventTimeRange,
  eventFilters = [],
}: {
  embeddable: LensApi;
  lens: LensPublicStart;
  origin: InvestigationSeed['origin'];
  eventTimeRange?: TimeRange;
  eventFilters?: readonly Filter[];
}): Promise<LensChartExtraction | undefined> => {
  const parent =
    apiHasParentApi(embeddable) && apiPublishesPartialUnifiedSearch(embeddable.parentApi)
      ? embeddable.parentApi
      : undefined;

  const embeddableRange = embeddable.timeRange$?.getValue();
  const parentRange = parent?.timeRange$?.getValue();
  const effectiveTimeRange = eventTimeRange ?? embeddableRange ?? parentRange;
  if (!effectiveTimeRange?.from || !effectiveTimeRange?.to) {
    return undefined;
  }

  const savedVis = embeddable.getSavedVis();
  const chartInfo = savedVis
    ? await (await (await lens.stateHelperApi()).chartInfo).getChartInfo(savedVis)
    : undefined;

  const infoMeta = readChartInfoMetadata(chartInfo);

  const dataSource = embeddable.dataSources$?.getValue()?.[0];
  const dataViewId = infoMeta.dataViewId ?? asBoundedField(dataSource?.id);
  const indexPattern = infoMeta.indexPattern ?? asBoundedText(dataSource?.title);

  const parentFilters = parent?.filters$?.getValue() ?? [];
  const childFilters = embeddable.filters$?.getValue() ?? [];
  const ambientFilters = [...parentFilters, ...childFilters, ...infoMeta.filters];
  const combinedFilters = [...ambientFilters, ...eventFilters].slice(0, MAX_INVESTIGATION_FILTERS);

  const query =
    nonEmptyQuery(parent?.query$?.getValue()) ??
    nonEmptyQuery(embeddable.query$?.getValue()) ??
    nonEmptyQuery(infoMeta.query);

  const entities = extractSeedEntities({
    clickedFilters: eventFilters,
    filters: ambientFilters,
    query,
  });

  const firstMetric = infoMeta.metrics[0];
  const selection = toSelectionBounds(eventTimeRange);

  const seed: InvestigationSeed = {
    origin,
    timeRange: {
      from: effectiveTimeRange.from,
      to: effectiveTimeRange.to,
    },
    ...(selection ? { selection } : {}),
    ...(query ? { query } : {}),
    filters: combinedFilters,
    ...(dataViewId ? { dataViewId } : {}),
    ...(indexPattern ? { indexPattern } : {}),
    ...(firstMetric
      ? {
          metric: {
            operationType: firstMetric.operationType,
            ...(firstMetric.field ? { field: firstMetric.field } : {}),
          },
        }
      : {}),
    ...(infoMeta.splitField ? { splitField: infoMeta.splitField } : {}),
    entities,
  };

  return {
    seed,
    metrics: infoMeta.metrics,
    metricUnreadable: infoMeta.metricUnreadable,
  };
};
