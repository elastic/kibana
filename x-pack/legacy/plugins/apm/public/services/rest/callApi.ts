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
import { APMAPI } from '../../../server/routes/create_apm_api';
import { Client } from '../../../server/routes/typings';

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

export async function callApi<T = void>(
  fetchOptions: KFetchOptions,
  options?: KFetchKibanaOptions
): Promise<T> {
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

export const callApmApi: Client<APMAPI['_S']> = (options => {
  const { pathname, params = {}, ...opts } = options;

  const path = (params.path || {}) as Record<string, any>;
  const body = params.body ? JSON.stringify(params.body) : undefined;
  const query = params.query || {};

  return callApi({
    ...opts,
    pathname: Object.keys(path || {}).reduce((acc, paramName) => {
      if (!(paramName in path)) {
        throw new Error(`Specified unexpected path parameter ${paramName}`);
      }
      return acc.replace(`{${paramName}}`, path[paramName]);
    }, pathname),
    body,
    query
  }) as any;
}) as Client<APMAPI['_S']>;

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
