/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, from, EMPTY } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { HttpStart } from '@kbn/core/public';
import { GlobalSearchResult, GlobalSearchProviderFindParams } from '../../common/types';
import { GlobalSearchFindOptions } from './types';

interface ServerFetchResponse {
  results: GlobalSearchResult[];
}

/**
 * Fetch the server-side results from the GS internal HTTP API.
 *
 * @remarks
 * Though this function returns an Observable, the current implementation is not streaming
 * results from the server. All results will be returned in a single batch when
 * all server-side providers are completed.
 */
export const fetchServerResults = (
  http: HttpStart,
  params: GlobalSearchProviderFindParams,
  { preference, aborted$ }: GlobalSearchFindOptions
): Observable<GlobalSearchResult[]> => {
  let controller: AbortController | undefined;
  if (aborted$) {
    controller = new AbortController();
    aborted$.subscribe(() => {
      controller!.abort();
    });
  }
  return from(
    http.post<ServerFetchResponse>('/internal/global_search/find', {
      body: JSON.stringify({ params, options: { preference } }),
      signal: controller?.signal,
    })
  ).pipe(
    takeUntil(aborted$ ?? EMPTY),
    map((response) => response.results)
  );
};
