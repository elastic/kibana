/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  AI_INDEX_INTERNAL_API_VERSION,
  MEMORY_DREAMING_DISABLE_PATH,
  MEMORY_DREAMING_ENABLE_PATH,
  MEMORY_DREAMING_PATH,
  MEMORY_DREAMING_RUN_PATH,
} from '../../../common/constants';
import type {
  EnableMemoryDreamingRequest,
  MemoryDreamingStatusResponse,
} from '../../../common/http_api/memory';

export const getMemoryDreamingStatus = (
  http: HttpStart,
  { signal }: { signal?: AbortSignal } = {}
): Promise<MemoryDreamingStatusResponse> =>
  http.get<MemoryDreamingStatusResponse>(MEMORY_DREAMING_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });

export const enableMemoryDreaming = (
  http: HttpStart,
  body: EnableMemoryDreamingRequest
): Promise<MemoryDreamingStatusResponse> =>
  http.post<MemoryDreamingStatusResponse>(MEMORY_DREAMING_ENABLE_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
    body: JSON.stringify(body),
  });

export const disableMemoryDreaming = (http: HttpStart): Promise<MemoryDreamingStatusResponse> =>
  http.post<MemoryDreamingStatusResponse>(MEMORY_DREAMING_DISABLE_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
  });

export const runMemoryDreaming = (http: HttpStart): Promise<MemoryDreamingStatusResponse> =>
  http.post<MemoryDreamingStatusResponse>(MEMORY_DREAMING_RUN_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
  });
