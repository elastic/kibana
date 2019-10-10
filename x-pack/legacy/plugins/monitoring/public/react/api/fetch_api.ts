/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch, KFetchOptions } from 'ui/kfetch';
import chrome from 'ui/chrome';

import TopLoadingBar from '../lib/top_loading_bar';

import { ajaxErrorHandler } from '../lib';

type RequestMethods = 'GET' | 'PUT' | 'POST' | 'DELETE';

interface IOptions {
  pathname?: string
  method?: RequestMethods
  body?: (string | Blob | ArrayBufferView | ArrayBuffer | FormData | URLSearchParams | ReadableStream<Uint8Array> | null | undefined) & Object
}

type OptionsUnion = KFetchOptions & IOptions | { method: RequestMethods };

type APIFetch = (path: string, options: OptionsUnion) => any

enum METHODS {
  GET = 'GET',
  PUT = 'PUT',
  POST = 'POST',
  DELETE = 'DELETE'
}

const DEFAULT_METHOD: RequestMethods = METHODS.GET;
const API_BASE_PATH: string = chrome.addBasePath('/api/monitoring/v1');

export const fetchAPI: APIFetch = async (path: string, options: OptionsUnion = { method: DEFAULT_METHOD }) => {
  if ('body' in options) {
    options.body = JSON.stringify(options.body);
  }

  if (!options.method) {
    options.method = DEFAULT_METHOD;
  }

  TopLoadingBar.show();

  try {
    const result = await kfetch({
      pathname: `${API_BASE_PATH}/${path}`,
      ...options
    });
    TopLoadingBar.hide();
    return result;
  } catch (error) {
    ajaxErrorHandler(error);
    TopLoadingBar.hide();
    throw new Error(error);
  }

};
