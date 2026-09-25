/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  DATA_STREAMS_SEARCH_INTERNAL_API_VERSION,
  DATA_STREAMS_SEARCH_PATH,
} from '../../../common/constants';
import type { SearchDataStreamsResponse } from '../../../common/http_api/data_streams';

interface SearchDataStreamsArgs {
  search?: string;
  signal?: AbortSignal;
}

/** Searches data streams for the trace picker; hidden are excluded server-side. */
export const searchDataStreams = (
  http: HttpStart,
  { search, signal }: SearchDataStreamsArgs = {}
): Promise<SearchDataStreamsResponse> =>
  http.get<SearchDataStreamsResponse>(DATA_STREAMS_SEARCH_PATH, {
    version: DATA_STREAMS_SEARCH_INTERNAL_API_VERSION,
    query: search ? { search } : {},
    ...(signal ? { signal } : {}),
  });
