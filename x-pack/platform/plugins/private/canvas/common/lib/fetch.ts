/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_TIMEOUT } from './constants';

const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'kbn-xsrf': 'professionally-crafted-string-of-text',
};

interface FetchResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

interface FetchInstance {
  defaults: {
    headers: Record<string, string>;
    responseType?: string;
  };
  get: <T = unknown>(url: string) => Promise<FetchResponse<T>>;
  post: <T = unknown>(url: string, body?: unknown) => Promise<FetchResponse<T>>;
  put: <T = unknown>(url: string, body?: unknown) => Promise<FetchResponse<T>>;
  delete: <T = unknown>(url: string) => Promise<FetchResponse<T>>;
}

const createFetchInstance = (options?: { responseType?: string }): FetchInstance => {
  const makeRequest = async <T>(url: string, init?: RequestInit): Promise<FetchResponse<T>> => {
    const response = await globalThis.fetch(url, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init?.headers as Record<string, string>),
      },
      signal: init?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    let data: T;
    if (options?.responseType === 'arraybuffer') {
      data = (await response.arrayBuffer()) as unknown as T;
    } else {
      data = (await response.json()) as T;
    }

    return { data, status: response.status, headers: response.headers };
  };

  return {
    defaults: {
      headers: { ...defaultHeaders },
      ...(options?.responseType ? { responseType: options.responseType } : {}),
    },
    get: <T = unknown>(url: string) => makeRequest<T>(url, { method: 'GET' }),
    post: <T = unknown>(url: string, body?: unknown) =>
      makeRequest<T>(url, {
        method: 'POST',
        body: body != null ? JSON.stringify(body) : undefined,
      }),
    put: <T = unknown>(url: string, body?: unknown) =>
      makeRequest<T>(url, {
        method: 'PUT',
        body: body != null ? JSON.stringify(body) : undefined,
      }),
    delete: <T = unknown>(url: string) => makeRequest<T>(url, { method: 'DELETE' }),
  };
};

export const fetch = createFetchInstance();

export const arrayBufferFetch = createFetchInstance({ responseType: 'arraybuffer' });
