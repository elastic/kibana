/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { KpiMetricIndex } from '../../../../common/constants';
import type { CustomKpiMetricConfiguration } from '../../../../common/types/domain';
import type { CasesAnalyticsV2SearchRequest } from '../../../cases_analytics_v2/reader';
import { getKpiMetricFieldError } from './validation';

export const KPI_METRIC_VALUE_AGG = 'kpi_value';

const DATE_FIELD_BY_INDEX: Record<KpiMetricIndex, string> = {
  cases: 'case.created_at',
  activity: '@timestamp',
  attachments: '@timestamp',
};

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

export const buildForcedFilters = (
  index: KpiMetricIndex,
  { spaceId, owner, from, to, caseIds }: KpiQueryContext
): estypes.QueryDslQueryContainer[] => [
  { term: { space_id: spaceId } },
  { term: { owner } },
  ...(caseIds != null ? [{ terms: { 'case.id': caseIds } }] : []),
  ...(from != null || to != null
    ? [
        {
          range: {
            [DATE_FIELD_BY_INDEX[index]]: {
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
  const forcedFilters = buildForcedFilters(metric.index, context);

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

  const aggs = buildAggregations(metric.aggregation);

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
