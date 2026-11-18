/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { KpiMetricFormat } from '../../../../common/constants';
import { getKpiField } from '../../../../common/constants';
import type { KpiMetricErrorResult, KpiMetricResult } from '../../../../common/types/api';
import type {
  CustomKpiMetricConfiguration,
  KpiMetricAggregationType,
} from '../../../../common/types/domain';
import { KPI_METRIC_VALUE_AGG } from './query_builder';

const MEDIAN_KEY = '50.0';

export const getKpiMetricFormat = ({
  index,
  aggregation,
  percent,
}: Pick<CustomKpiMetricConfiguration, 'index' | 'aggregation' | 'percent'>): KpiMetricFormat => {
  if (percent === true) {
    return 'percent';
  }

  if (
    aggregation?.field == null ||
    aggregation.type === 'count' ||
    aggregation.type === 'cardinality'
  ) {
    return 'number';
  }

  return getKpiField(index, aggregation.field)?.unit === 's' ? 'duration' : 'number';
};

export const toKpiMetricError = (id: string, message: string): KpiMetricErrorResult => ({
  id,
  type: 'error',
  message,
});

const readTotalHits = (response: estypes.MsearchMultiSearchItem): number => {
  const total = response.hits.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
};

const readAggregateValue = (
  aggregate: estypes.AggregationsAggregate | undefined,
  type: KpiMetricAggregationType
): number | null => {
  if (aggregate == null) {
    return null;
  }

  if (type === 'median') {
    if (!('values' in aggregate)) {
      return null;
    }

    const { values } = aggregate;
    const median = Array.isArray(values)
      ? values.find(({ key }) => Number(key) === 50)?.value
      : values?.[MEDIAN_KEY];

    return typeof median === 'number' ? median : null;
  }

  return 'value' in aggregate && typeof aggregate.value === 'number' ? aggregate.value : null;
};

const readPercentValue = (response: estypes.MsearchMultiSearchItem): number | null => {
  const total = readTotalHits(response);
  const matches = response.aggregations?.[KPI_METRIC_VALUE_AGG];

  if (total === 0 || matches == null || !('doc_count' in matches)) {
    return null;
  }

  return (matches.doc_count / total) * 100;
};

/**
 * Reads the value of one metric from its search response.
 */
export const readKpiMetricValue = (
  { aggregation, percent }: Pick<CustomKpiMetricConfiguration, 'aggregation' | 'percent'>,
  response: estypes.MsearchMultiSearchItem
): number | null => {
  if (percent === true) {
    return readPercentValue(response);
  }

  if (aggregation == null || aggregation.type === 'count') {
    return readTotalHits(response);
  }

  return readAggregateValue(response.aggregations?.[KPI_METRIC_VALUE_AGG], aggregation.type);
};

/**
 * Returns true when the search timed out or a shard failed, so the hits and the aggregations can be partial.
 */
export const isIncompleteKpiSearchResponse = (response: estypes.MsearchMultiSearchItem): boolean =>
  response.timed_out || response._shards.failed > 0;

/**
 * Maps one msearch response item to the typed result of its metric.
 */
export const mapKpiSearchResponse = (
  metric: CustomKpiMetricConfiguration,
  response: estypes.MsearchResponseItem | undefined
): KpiMetricResult => {
  if (response == null) {
    return toKpiMetricError(metric.id, 'The metric search returned no response.');
  }

  if ('error' in response) {
    return toKpiMetricError(metric.id, response.error.reason ?? 'The metric search failed.');
  }

  if (isIncompleteKpiSearchResponse(response)) {
    return toKpiMetricError(metric.id, 'The metric search returned incomplete results.');
  }

  return {
    id: metric.id,
    type: 'value',
    format: getKpiMetricFormat(metric),
    value: readKpiMetricValue(metric, response),
  };
};
