/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SESSION_EVENTS_DATA_STREAM } from './data_streams';
import type {
  SaveEventResult,
  SessionEventInput,
  SessionEventsService,
  StoredSessionEvent,
  StoredSessionEventTypeFields,
} from './types';

const toTypeFields = (event: SessionEventInput): StoredSessionEventTypeFields => {
  switch (event.type) {
    case 'user':
      return { type: 'user', content: event.content };
    case 'assistant': {
      const toolNames = [...new Set((event.tool_calls ?? []).map(({ name }) => name))];
      return {
        type: 'assistant',
        ...(event.content !== undefined && { content: event.content }),
        ...(toolNames.length > 0 && { tool_name: toolNames }),
      };
    }
    case 'tool':
      return {
        type: 'tool',
        tool_name: event.tool_name,
        status: event.status ?? 'unknown',
      };
    case 'reasoning':
    case 'meta':
      return { type: event.type };
  }
};

const toResult = (id: string, item: BulkResponseItem | undefined): SaveEventResult => {
  const error = item?.error;
  if (!error) {
    return { id, status: 'created' };
  }
  const reason = error.reason ?? error.type;
  const cause = error.caused_by?.reason;
  return { id, status: 'failed', error: cause ? `${reason}: ${cause}` : reason };
};

/** `esClient` must send the product origin that system data streams require, as core's clients do. */
export const createSessionEventsService = (
  esClient: ElasticsearchClient
): SessionEventsService => ({
  saveEvents: async ({ space, userId }, { sessionId, aiIndexIds = [], events }) => {
    if (events.length === 0) {
      return { results: [] };
    }

    const timestamp = new Date().toISOString();
    const response = await esClient.bulk<StoredSessionEvent>({
      require_data_stream: true,
      operations: events.flatMap((event) => [
        { create: { _index: SESSION_EVENTS_DATA_STREAM } },
        {
          '@timestamp': timestamp,
          event_at: event.event_at,
          id: event.id,
          ...(event.seq !== undefined && { seq: event.seq }),
          space,
          ai_index_id: aiIndexIds,
          session_id: sessionId,
          turn_id: event.turn_id,
          user_id: userId,
          ...toTypeFields(event),
          raw: event,
        },
      ]),
    });

    // The bulk API reports a rejected event in its item instead of throwing, and keeps the order.
    return {
      results: response.items.map((item, index) => toResult(events[index].id, item.create)),
    };
  },
});
