/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  SESSION_MEMORY_INTERNAL_API_VERSION,
  SESSION_MEMORY_LIST_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
  SESSION_MEMORY_SEARCH_PATH,
} from '../../../common/constants';
import type {
  ListSessionMemoryQuery,
  ListSessionMemoryResponse,
  RememberSessionMemoryBody,
  RememberSessionMemoryResponse,
  SearchSessionMemoryBody,
  SearchSessionMemoryResponse,
} from '../../../common/http_api/session_memory';

interface WithSignal {
  signal?: AbortSignal;
}

const toListQuery = (query: ListSessionMemoryQuery) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));

export const rememberSessionMemory = (
  http: HttpStart,
  { body, signal }: { body: RememberSessionMemoryBody } & WithSignal
): Promise<RememberSessionMemoryResponse> =>
  http.post<RememberSessionMemoryResponse>(SESSION_MEMORY_REMEMBER_PATH, {
    version: SESSION_MEMORY_INTERNAL_API_VERSION,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

export const searchSessionMemory = (
  http: HttpStart,
  { body, signal }: { body: SearchSessionMemoryBody } & WithSignal
): Promise<SearchSessionMemoryResponse> =>
  http.post<SearchSessionMemoryResponse>(SESSION_MEMORY_SEARCH_PATH, {
    version: SESSION_MEMORY_INTERNAL_API_VERSION,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

export const listSessionMemory = (
  http: HttpStart,
  { signal, ...query }: ListSessionMemoryQuery & WithSignal
): Promise<ListSessionMemoryResponse> =>
  http.get<ListSessionMemoryResponse>(SESSION_MEMORY_LIST_PATH, {
    version: SESSION_MEMORY_INTERNAL_API_VERSION,
    query: toListQuery(query),
    ...(signal ? { signal } : {}),
  });
