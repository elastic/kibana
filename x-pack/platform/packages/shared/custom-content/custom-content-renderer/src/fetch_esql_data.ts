/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionRequestParams } from '@elastic/transport';
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
import type { ISearchGeneric } from '@kbn/search-types';
import {
  getESQLResults,
  getESQLTimeField,
  getEsqlInspectorStats,
  getEsqlSearchParams,
} from '@kbn/esql-utils';
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

const getInspectorErrorJson = (error: unknown): object =>
  (error as { attributes?: object } | null)?.attributes ?? {
    message: error instanceof Error ? error.message : String(error),
  };

export async function fetchEsqlData(
  search: ISearchGeneric,
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
  requestAdapter?.reset();
  const startTime = Date.now();
  const logRequest = () =>
    requestAdapter?.start(
      INSPECTOR_REQUEST_TITLE,
      { description: INSPECTOR_REQUEST_DESCRIPTION },
      startTime
    );

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

  const requestBody = {
    ...getEsqlSearchParams({ esqlQuery, filter, timeRange, variables: esqlVariables }),
    ...(isApproximate !== undefined ? { approximation: isApproximate } : {}),
    ...(projectRouting !== undefined ? { project_routing: projectRouting } : {}),
  };

  try {
    const { response, params } = await getESQLResults({
      esqlQuery,
      search,
      signal,
      filter,
      timeRange,
      ...(isApproximate !== undefined ? { approximation: isApproximate } : {}),
      ...(projectRouting !== undefined ? { projectRouting } : {}),
      ...(esqlVariables?.length ? { variables: esqlVariables } : {}),
    });

    const requestParams = params as unknown as ConnectionRequestParams;

    // A newer fetch has already reset the adapter, so this response must not leave a stale entry.
    if (!signal.aborted) {
      logRequest()
        ?.stats(getEsqlInspectorStats(response))
        .json(requestBody)
        .ok({ json: { rawResponse: response }, requestParams });
    }

    return response;
  } catch (error: unknown) {
    // A superseded fetch is aborted on purpose; it is not a failed request worth showing.
    if (!signal.aborted) {
      logRequest()
        ?.json(requestBody)
        .error({ json: getInspectorErrorJson(error) });
    }
    throw error;
  }
}
