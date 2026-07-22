/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { getESQLResults, getESQLTimeFieldFromQuery } from '@kbn/esql-utils';
import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ISearchGeneric } from '@kbn/search-types';

export type EsqlDataResult = ESQLSearchResponse;

/**
 * Fetches ES|QL query results client-side via the data plugin's search service.
 *
 * Time field detection uses `getESQLTimeFieldFromQuery` which calls the server's
 * timefield API — AST parsing first, then `@timestamp` fieldCaps fallback.
 */
export async function fetchEsqlData(
  search: ISearchGeneric,
  http: HttpStart,
  esqlQuery: string,
  timeRange: TimeRange | undefined,
  signal: AbortSignal
): Promise<EsqlDataResult> {
  let filter: unknown;

  if (timeRange) {
    const timeField = await getESQLTimeFieldFromQuery({ query: esqlQuery, http });
    if (timeField) {
      filter = {
        range: {
          [timeField]: {
            gte: dateMath.parse(timeRange.from)?.toISOString(),
            lt: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString(),
            format: 'strict_date_optional_time',
          },
        },
      };
    }
  }

  const { response } = await getESQLResults({
    esqlQuery,
    search,
    signal,
    filter,
    timeRange,
  });

  return response;
}
