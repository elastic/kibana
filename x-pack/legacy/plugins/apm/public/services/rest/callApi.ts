/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FetchOptions } from 'apollo-link-http';
import { isString, startsWith } from 'lodash';
import LRU from 'lru-cache';
import hash from 'object-hash';
import { kfetch, KFetchOptions } from 'ui/kfetch';
import { KFetchKibanaOptions } from 'ui/kfetch/kfetch';

function fetchOptionsWithDebug(fetchOptions: KFetchOptions) {
  const debugEnabled =
    sessionStorage.getItem('apm_debug') === 'true' &&
    startsWith(fetchOptions.pathname, '/api/apm');

  if (!debugEnabled) {
    return fetchOptions;
  }

  return {
    ...fetchOptions,
    query: {
      ...fetchOptions.query,
      _debug: true
    }
  };
}

const cache = new LRU<string, any>({ max: 100, maxAge: 1000 * 60 * 60 });

export function _clearCache() {
  cache.reset();
}

interface CallApiOptions<Q extends Record<string, any>> extends KFetchOptions {
  query?: Q;
}

interface Route {
  method: string;
  handler: (req: any) => any;
}
export async function callApi<R extends Route>(
  fetchOptions: CallApiOptions<Parameters<R['handler']>[0]['query']>,
  options?: KFetchKibanaOptions
): Promise<ReturnType<R['handler']>> {
  const cacheKey = getCacheKey(fetchOptions);
  const cacheResponse = cache.get(cacheKey);
  if (cacheResponse) {
    return cacheResponse;
  }

  const combinedFetchOptions = fetchOptionsWithDebug(fetchOptions);
  const res = await kfetch(combinedFetchOptions, options);

  if (isCachable(fetchOptions)) {
    cache.set(cacheKey, res);
  }

  return res;
}

// only cache items that has a time range with `start` and `end` params,
// and where `end` is not a timestamp in the future
function isCachable(fetchOptions: KFetchOptions) {
  if (
    !(fetchOptions.query && fetchOptions.query.start && fetchOptions.query.end)
  ) {
    return false;
  }

  return (
    isString(fetchOptions.query.end) &&
    new Date(fetchOptions.query.end).getTime() < Date.now()
  );
}

// order the options object to make sure that two objects with the same arguments, produce produce the
// same cache key regardless of the order of properties
function getCacheKey(options: FetchOptions) {
  return hash(options);
}
