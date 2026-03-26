/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchGeneric } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { getESQLResults } from '@kbn/esql-utils';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { buildEsqlFilter } from '@kbn/streams-plugin/public';

interface ExecuteEsqlParams {
  query: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  filter?: estypes.QueryDslQueryContainer;
  timezone?: string;
  kuery?: string;
  start?: number;
  end?: number;
  dropNullColumns?: boolean;
}

/**
 * Executes an ES|QL query using the data plugin's search service.
 * This replaces the previous /internal/streams/esql route by executing queries client-side.
 *
 * @param params - Query execution parameters
 * @returns Promise resolving to the ES|QL search response
 */
export async function executeEsqlQuery({
  query,
  search,
  signal,
  dropNullColumns,
  filter,
  timezone,
  kuery,
  start,
  end,
}: ExecuteEsqlParams): Promise<ESQLSearchResponse> {
  const combinedFilter = buildEsqlFilter({ filter, kuery, start, end });

  const { response } = await getESQLResults({
    dropNullColumns,
    esqlQuery: query,
    search,
    signal,
    filter: combinedFilter,
    timezone,
    timeRange:
      start !== undefined && end !== undefined
        ? {
            from: new Date(start).toISOString(),
            to: new Date(end).toISOString(),
            mode: 'absolute' as const,
          }
        : undefined,
  });

  return response;
}
