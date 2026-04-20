/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';

export interface RunEsqlAsyncSearchOptions {
  data: DataPublicPluginStart;
  params: ESQLSearchParams;
  abortSignal?: AbortSignal;
}

/**
 * Runs an ES|QL query via the data plugin async ES|QL search strategy.
 */
export const runEsqlAsyncSearch = async ({
  data,
  params,
  abortSignal,
}: RunEsqlAsyncSearchOptions): Promise<ESQLSearchResponse> => {
  const response = await firstValueFrom(
    data.search.search<
      IKibanaSearchRequest<ESQLSearchParams>,
      IKibanaSearchResponse<ESQLSearchResponse>
    >(
      { params },
      {
        abortSignal,
        strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      }
    )
  );
  return response.rawResponse;
};
