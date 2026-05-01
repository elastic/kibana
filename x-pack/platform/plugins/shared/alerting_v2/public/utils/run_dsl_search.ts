/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type {
  AggregationsAggregate,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';

export interface RunDslSearchOptions {
  data: DataPublicPluginStart;
  params: SearchRequest;
  abortSignal?: AbortSignal;
}

/**
 * Runs a DSL search via the data plugin's default Elasticsearch search
 * strategy. Counterpart to `runEsqlAsyncSearch` for queries that ES|QL cannot
 * express — notably terms aggregations against `flattened` sub-fields, which
 * ES|QL exposes as a single `unsupported`-typed column.
 */
export const runDslSearch = async <
  TDoc = unknown,
  TAggs extends Record<string, AggregationsAggregate> = Record<string, AggregationsAggregate>
>({
  data,
  params,
  abortSignal,
}: RunDslSearchOptions): Promise<SearchResponse<TDoc, TAggs>> => {
  const response = await firstValueFrom(
    data.search.search<
      IKibanaSearchRequest<SearchRequest>,
      IKibanaSearchResponse<SearchResponse<TDoc, TAggs>>
    >({ params }, { abortSignal })
  );
  return response.rawResponse;
};
