/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { KpiMetricIndex } from '../../../../common/constants';
import { DEFAULT_KPI_BREAKDOWN_SIZE } from '../../../../common/constants';
import type {
  CustomKpiMetricConfiguration,
  KpiMetricDateField,
  KpiMetricGroupBy,
} from '../../../../common/types/domain';
import type { CasesAnalyticsV2SearchRequest } from '../../../cases_analytics_v2/reader';
import { getKpiMetricFieldError } from './validation';

export const KPI_METRIC_VALUE_AGG = 'kpi_value';
export const KPI_METRIC_MISSING_AGG = 'kpi_missing';

const CASES_DATE_FIELDS: Record<KpiMetricDateField, string> = {
  created_at: 'case.created_at',
  closed_at: 'case.closed_at',
};

const getDateRangeField = (
  index: KpiMetricIndex,
  dateField: KpiMetricDateField = 'created_at'
): string => (index === 'cases' ? CASES_DATE_FIELDS[dateField] : '@timestamp');

export interface KpiQueryContext {
  spaceId: string;
  owner: string;
  from?: string;
  to?: string;
  /**
   * The ids of the cases that match the case list filters. Undefined when no list filter is active.
   */
  caseIds?: string[];
}

export type KpiSearchRequest = CasesAnalyticsV2SearchRequest;

/**
 * Builds the forced space, owner, case id, and date range clauses. The date field applies to the cases index only.
 */
export const buildForcedFilters = (
  index: KpiMetricIndex,
  { spaceId, owner, from, to, caseIds }: KpiQueryContext,
  dateField?: KpiMetricDateField
): estypes.QueryDslQueryContainer[] => [
  { term: { space_id: spaceId } },
  { term: { owner } },
  ...(caseIds != null ? [{ terms: { 'case.id': caseIds } }] : []),
  ...(from != null || to != null
    ? [
        {
          range: {
            [getDateRangeField(index, dateField)]: {
              ...(from != null && { gte: from }),
              ...(to != null && { lte: to }),
            },
          },
        },
      ]
    : []),
];

const buildAggregations = (
  aggregation: CustomKpiMetricConfiguration['aggregation']
): Record<string, estypes.AggregationsAggregationContainer> | undefined => {
  if (aggregation == null || aggregation.type === 'count' || aggregation.field == null) {
    return;
  }

  const { type, field } = aggregation;

  if (type === 'median') {
    return { [KPI_METRIC_VALUE_AGG]: { percentiles: { field, percents: [50] } } };
  }

  return { [KPI_METRIC_VALUE_AGG]: { [type]: { field } } };
};

const buildBreakdownAggregations = ({
  field,
  size = DEFAULT_KPI_BREAKDOWN_SIZE,
}: KpiMetricGroupBy): Record<string, estypes.AggregationsAggregationContainer> => ({
  [KPI_METRIC_VALUE_AGG]: { terms: { field, size } },
  [KPI_METRIC_MISSING_AGG]: { missing: { field } },
});

/**
 * Builds the search of one custom metric. The admin KQL is parsed into its own clause,
 * next to separate space, owner, and date range clauses, so no admin text can remove them.
 * A percent metric keeps only the forced clauses in the query and counts the KQL matches in a filter aggregation.
 * Throws when the KQL does not parse or the field is not allowed.
 */
export const buildKpiMetricSearch = (
  metric: CustomKpiMetricConfiguration,
  context: KpiQueryContext
): KpiSearchRequest => {
  const fieldError = getKpiMetricFieldError(metric);

  if (fieldError != null) {
    throw new Error(fieldError);
  }

  const kqlClause =
    metric.query.trim() === '' ? [] : [toElasticsearchQuery(fromKueryExpression(metric.query))];
  const forcedFilters = buildForcedFilters(metric.index, context, metric.dateField);

  if (metric.percent === true) {
    return {
      index: metric.index,
      body: {
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: forcedFilters } },
        aggs: {
          [KPI_METRIC_VALUE_AGG]: { filter: { bool: { filter: kqlClause } } },
        },
      },
    };
  }

  const aggs =
    metric.groupBy != null
      ? buildBreakdownAggregations(metric.groupBy)
      : buildAggregations(metric.aggregation);

  return {
    index: metric.index,
    body: {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...forcedFilters, ...kqlClause],
        },
      },
      ...(aggs != null && { aggs }),
    },
  };
};
