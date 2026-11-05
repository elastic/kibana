/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ES_SESSION_EVENTS_PATH } from '../../common/constants';
import type {
  SaveSessionEventBody,
  SaveSessionEventResponse,
} from '../../common/http_api/session_memory';

export interface SessionEventsServiceApi {
  /** Stores a raw transcript for a session round in the Context Engine session events data stream. */
  save(body: SaveSessionEventBody): Promise<SaveSessionEventResponse>;
}

/**
 * Writes session events through the Elasticsearch `_context_engine/session_events` API. Bound to
 * the internal client: the backing data stream is an ES-owned system data stream and `kibana_system`
 * holds the `manage_context_engine` privilege, so callers gate access on Kibana privileges instead.
 */
export class SessionEventsService implements SessionEventsServiceApi {
  constructor(private readonly esClient: ElasticsearchClient) {}

  save(body: SaveSessionEventBody): Promise<SaveSessionEventResponse> {
    return this.esClient.transport.request<SaveSessionEventResponse>({
      method: 'POST',
      path: `${ES_SESSION_EVENTS_PATH}/_save`,
      body,
    });
  }
}
