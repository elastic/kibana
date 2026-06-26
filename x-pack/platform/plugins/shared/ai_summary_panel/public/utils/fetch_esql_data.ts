/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLResults, getTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import dateMath from '@kbn/datemath';
import type { ISearchGeneric } from '@kbn/search-types';

export type EsqlDataResult = Awaited<ReturnType<typeof getESQLResults>>['response'];

/**
 * Fetches ES|QL query results client-side via the data plugin's search service.
 *
 * Time filtering: if the query contains `?_tstart` / `?_tend` named parameters,
 * `timeRange` is resolved and passed automatically. For queries without time params,
 * use `WHERE field >= ?_tstart AND field < ?_tend` to opt in to dashboard time filtering.
 */
export async function fetchEsqlData(
  search: ISearchGeneric,
  esqlQuery: string,
  timeRange: { from: string; to: string } | undefined,
  signal: AbortSignal
): Promise<EsqlDataResult> {
  // Build a DSL range filter when the query declares a time field via ?_tstart / ?_tend.
  // Queries without those params are time-independent and return all results.
  let filter: unknown;
  if (timeRange) {
    const timeField = getTimeFieldFromESQLQuery(esqlQuery);
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
