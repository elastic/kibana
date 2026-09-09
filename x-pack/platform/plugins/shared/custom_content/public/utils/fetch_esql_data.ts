/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { HttpStart } from '@kbn/core/public';
import type {
  AggregateQuery,
  EsQueryConfig,
  Filter,
  Query,
  TimeRange,
  ProjectRouting,
} from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ISearchGeneric } from '@kbn/search-types';
import { getESQLResults, getESQLTimeField } from '@kbn/esql-utils';
import type { ESQLControlVariable } from '@kbn/esql-types';

export type EsqlDataResult = ESQLSearchResponse;

export interface FetchEsqlOptions {
  isApproximate?: boolean;
  projectRouting?: ProjectRouting;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  esQueryConfig?: EsQueryConfig;
  esqlVariables?: ESQLControlVariable[];
}

export async function fetchEsqlData(
  search: ISearchGeneric,
  http: HttpStart,
  esqlQuery: string,
  timeRange: TimeRange | undefined,
  signal: AbortSignal,
  options?: FetchEsqlOptions
): Promise<EsqlDataResult> {
  const { isApproximate, projectRouting, query, filters, esQueryConfig, esqlVariables } =
    options ?? {};

  let timeRangeFilter: { range: Record<string, unknown> } | undefined;
  if (timeRange) {
    let timeField: string | undefined;
    try {
      timeField = (await getESQLTimeField({ query: esqlQuery, http })) ?? undefined;
    } catch {
      // field caps unavailable — render without time filter
    }
    if (timeField) {
      const gte = dateMath.parse(timeRange.from)?.toISOString();
      const lt = dateMath.parse(timeRange.to, { roundUp: true })?.toISOString();
      if (gte && lt) {
        timeRangeFilter = {
          range: { [timeField]: { gte, lt, format: 'strict_date_optional_time' } },
        };
      }
    }
  }

  const esBoolQuery = buildEsQuery(undefined, query ?? [], filters ?? [], esQueryConfig);

  const allFilters = timeRangeFilter
    ? [...esBoolQuery.bool.filter, timeRangeFilter]
    : esBoolQuery.bool.filter;

  const hasConstraints =
    allFilters.length > 0 ||
    esBoolQuery.bool.must_not.length > 0 ||
    esBoolQuery.bool.should.length > 0 ||
    esBoolQuery.bool.must.length > 0;

  const filter = hasConstraints ? { bool: { ...esBoolQuery.bool, filter: allFilters } } : undefined;

  const { response } = await getESQLResults({
    esqlQuery,
    search,
    signal,
    filter,
    timeRange,
    ...(isApproximate !== undefined ? { approximation: isApproximate } : {}),
    ...(projectRouting !== undefined ? { projectRouting } : {}),
    ...(esqlVariables?.length ? { variables: esqlVariables } : {}),
  });

  return response;
}
