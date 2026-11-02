/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  SESSION_MEMORY_BY_SESSION_PATH,
  SESSION_MEMORY_INTERNAL_API_VERSION,
  SESSION_MEMORY_REMEMBER_PATH,
  SESSION_MEMORY_SEARCH_PATH,
} from '../../../common/constants';
import type {
  ListSessionMemoryResponse,
  RememberSessionMemoryBody,
  RememberSessionMemoryResponse,
  SearchSessionMemoryBody,
  SearchSessionMemoryResponse,
  SessionScopeQuery,
} from '../../../common/http_api/session_memory';

interface WithSignal {
  signal?: AbortSignal;
}

const toScopeQuery = ({ space, ai_index_id: aiIndexId, size }: SessionScopeQuery) => ({
  ...(space !== undefined ? { space } : {}),
  ...(aiIndexId !== undefined ? { ai_index_id: aiIndexId } : {}),
  ...(size !== undefined ? { size } : {}),
});

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
  { sessionId, signal, ...query }: { sessionId: string } & SessionScopeQuery & WithSignal
): Promise<ListSessionMemoryResponse> =>
  http.get<ListSessionMemoryResponse>(buildPath(SESSION_MEMORY_BY_SESSION_PATH, { sessionId }), {
    version: SESSION_MEMORY_INTERNAL_API_VERSION,
    query: toScopeQuery(query),
    ...(signal ? { signal } : {}),
  });
