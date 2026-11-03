/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ES_SESSION_MEMORY_PATH } from '../../common/constants';
import type {
  RememberSessionMemoryBody,
  RememberSessionMemoryResponse,
  SearchSessionMemoryBody,
  SearchSessionMemoryResponse,
} from '../../common/http_api/session_memory';

export interface SessionMemoryServiceApi {
  /** Stores a memory (text, media, or both) in the Context Engine session memory data stream. */
  remember(body: RememberSessionMemoryBody): Promise<RememberSessionMemoryResponse>;
  /** Searches session memory by meaning with a text or media query. */
  search(body: SearchSessionMemoryBody): Promise<SearchSessionMemoryResponse>;
}

/**
 * Writes and searches session memory through the Elasticsearch `_context_engine/session_memory`
 * API. Bound to the internal client for the same reason as the session events service: the backing
 * data stream is ES-owned and `kibana_system` holds `manage_context_engine`, so callers gate access
 * on Kibana privileges.
 */
export class SessionMemoryService implements SessionMemoryServiceApi {
  constructor(private readonly esClient: ElasticsearchClient) {}

  remember(body: RememberSessionMemoryBody): Promise<RememberSessionMemoryResponse> {
    return this.esClient.transport.request<RememberSessionMemoryResponse>({
      method: 'POST',
      path: `${ES_SESSION_MEMORY_PATH}/_remember`,
      body,
    });
  }

  search(body: SearchSessionMemoryBody): Promise<SearchSessionMemoryResponse> {
    return this.esClient.transport.request<SearchSessionMemoryResponse>({
      method: 'POST',
      path: `${ES_SESSION_MEMORY_PATH}/_search`,
      body,
    });
  }
}
