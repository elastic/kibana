/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { estypes } from '@elastic/elasticsearch';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { buildEsqlFilter } from '@kbn/streams-plugin/public';
import type { ISearchMethods } from '@kbn/search-types';

interface ExecuteEsqlParams {
  query: string;
  search: Pick<ISearchMethods, 'esql'>;
  signal?: AbortSignal;
  filter?: estypes.QueryDslQueryContainer;
  kuery?: string;
  start?: number;
  end?: number;
  dropNullColumns?: boolean;
  /** Required so KQL → ES|QL `filter` respects Advanced Settings (e.g. `query:allowLeadingWildcards`). */
  uiSettings: IUiSettingsClient;
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
  kuery,
  start,
  end,
  uiSettings,
}: ExecuteEsqlParams): Promise<ESQLSearchResponse> {
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const combinedFilter = buildEsqlFilter({ filter, kuery, start, end, esQueryConfig });

  const { rawResponse } = await search.esql(
    {
      query,
      dropNullColumns,
      filter: combinedFilter,
      kibanaQueryContext: {
        timeRange:
          start !== undefined && end !== undefined
            ? {
                from: new Date(start).toISOString(),
                to: new Date(end).toISOString(),
                mode: 'absolute' as const,
              }
            : undefined,
      },
    },
    { abortSignal: signal }
  );

  return rawResponse;
}
