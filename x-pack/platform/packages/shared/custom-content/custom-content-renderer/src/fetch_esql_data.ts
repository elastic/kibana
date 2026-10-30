/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
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
import type { ISearchMethods } from '@kbn/search-types';
import { getESQLTimeField } from '@kbn/esql-utils';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';

export type EsqlDataResult = ESQLSearchResponse;

export interface FetchEsqlOptions {
  isApproximate?: boolean;
  projectRouting?: ProjectRouting;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  esQueryConfig?: EsQueryConfig;
  esqlVariables?: ESQLControlVariable[];
  /** Records the request so the panel's Inspect action can show it. */
  requestAdapter?: RequestAdapter;
}

const INSPECTOR_REQUEST_TITLE = i18n.translate('xpack.customContent.inspector.requestTitle', {
  defaultMessage: 'Data',
});

const INSPECTOR_REQUEST_DESCRIPTION = i18n.translate(
  'xpack.customContent.inspector.requestDescription',
  {
    defaultMessage: 'This request queries Elasticsearch to fetch the data for the custom panel.',
  }
);

export async function fetchEsqlData(
  search: Pick<ISearchMethods, 'esql'>,
  http: HttpStart,
  esqlQuery: string,
  timeRange: TimeRange | undefined,
  signal: AbortSignal,
  options?: FetchEsqlOptions
): Promise<EsqlDataResult> {
  const {
    isApproximate,
    projectRouting,
    query,
    filters,
    esQueryConfig,
    esqlVariables,
    requestAdapter,
  } = options ?? {};

  // One request per fetch, so the Requests view shows the latest query instead of a growing list.
  // A superseded fetch is dropped by the newer fetch's reset, so it never leaves a stale entry.
  requestAdapter?.reset();

  let timeRangeFilter: estypes.QueryDslQueryContainer | undefined;
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

  const { rawResponse } = await search.esql(
    {
      query: esqlQuery,
      ...(filter ? { filter } : {}),
      ...(isApproximate !== undefined ? { approximation: isApproximate } : {}),
      ...(projectRouting !== undefined ? { projectRouting } : {}),
      kibanaQueryContext: { timeRange, esqlVariables },
    },
    {
      abortSignal: signal,
      ...(requestAdapter
        ? {
            inspector: {
              adapter: requestAdapter,
              title: INSPECTOR_REQUEST_TITLE,
              description: INSPECTOR_REQUEST_DESCRIPTION,
            },
          }
        : {}),
    }
  );

  return rawResponse;
}
