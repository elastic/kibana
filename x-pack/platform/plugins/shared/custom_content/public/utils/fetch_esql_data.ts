/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { HttpStart } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ISearchGeneric } from '@kbn/search-types';
import { getESQLResults, getESQLTimeField } from '@kbn/esql-utils';

export type EsqlDataResult = ESQLSearchResponse;

export async function fetchEsqlData(
  search: ISearchGeneric,
  http: HttpStart,
  esqlQuery: string,
  timeRange: TimeRange | undefined,
  signal: AbortSignal
): Promise<EsqlDataResult> {
  let filter: unknown;

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
        filter = {
          range: {
            [timeField]: { gte, lt, format: 'strict_date_optional_time' },
          },
        };
      }
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
