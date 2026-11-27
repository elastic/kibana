/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchGeneric,
  ISearchOptions,
} from '@kbn/search-types';

/** Creates a data plugin `search` that posts requests to the internal search route with `http.post`. */
export const createSearchMock =
  (http: HttpSetup): ISearchGeneric =>
  <TRequest extends IKibanaSearchRequest, TResponse extends IKibanaSearchResponse>(
    request: TRequest,
    options?: ISearchOptions
  ) =>
    from(
      http.post<TResponse>(`/internal/search/${String(options?.strategy)}`, {
        body: JSON.stringify(request),
        signal: options?.abortSignal,
      })
    );

/** Creates a data plugin start contract whose `search` uses {@link createSearchMock}. */
export const createDataMock = (http: HttpSetup): DataPublicPluginStart => {
  const data = dataPluginMock.createStartContract();
  data.search.search = createSearchMock(http);
  return data;
};
