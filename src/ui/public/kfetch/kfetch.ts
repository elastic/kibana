/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import 'isomorphic-fetch';
// @ts-ignore not really worth typing
import { metadata } from 'ui/metadata';
import url from 'url';
import chrome from '../chrome';
import { KFetchError } from './kfetch_error';

interface KFetchQuery {
  [key: string]: string | number | boolean;
}

export interface KFetchOptions extends RequestInit {
  pathname?: string;
  query?: KFetchQuery;
}

export interface KFetchKibanaOptions {
  prependBasePath?: boolean;
}

export interface Interceptor {
  request?: (config: any) => any;
  requestError?: (e: any) => any;
  response?: (res: any) => any;
  responseError?: (e: any) => any;
}

export const interceptors: Interceptor[] = [];
export function _resetInterceptors() {
  interceptors.length = 0;
}

export async function kfetch(
  options: KFetchOptions,
  { prependBasePath = true }: KFetchKibanaOptions = {}
) {
  const combinedOptions = {
    method: 'GET',
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'kbn-version': metadata.version,
      ...options.headers,
    },
  };
  const { pathname, query, ...restOptions } = await successInterceptors(combinedOptions, 'request');
  const fullUrl = url.format({
    pathname: prependBasePath ? chrome.addBasePath(pathname) : pathname,
    query,
  });

  let res;
  try {
    res = await fetch(fullUrl, restOptions);
  } catch (e) {
    return errorInterceptors(e, 'requestError');
  }

  if (res.ok) {
    const json = await res.json();
    return successInterceptors(json, 'response');
  }

  const error = new KFetchError(res, getBodyAsJson(res));
  return errorInterceptors(error, 'responseError');
}

function successInterceptors(res: any, name: 'request' | 'response') {
  return interceptors.reduce((acc, interceptor) => {
    const fn = interceptor[name];
    if (!fn) {
      return acc;
    }

    return acc.then(fn);
  }, Promise.resolve(res));
}

function errorInterceptors(e: Error, name: 'requestError' | 'responseError') {
  return interceptors.reduce((acc: Promise<any>, interceptor) => {
    const fn = interceptor[name];
    if (!fn) {
      return acc;
    }

    return acc.catch(fn);
  }, Promise.reject(e));
}

async function getBodyAsJson(res: Response) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}
