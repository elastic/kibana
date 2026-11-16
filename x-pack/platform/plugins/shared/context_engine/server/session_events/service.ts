/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
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

const toDocumentId = (space: string, sessionId: string, id: string): string =>
  createHash('sha256')
    .update(JSON.stringify([space, sessionId, id]))
    .digest('hex');

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
        ...(event.ok !== undefined && { ok: event.ok }),
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
  if (error.type === 'version_conflict_engine_exception') {
    return { id, status: 'already_stored' };
  }
  return { id, status: 'failed', error: error.reason ?? error.type };
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
      operations: events.flatMap((event) => [
        {
          create: {
            _index: SESSION_EVENTS_DATA_STREAM,
            _id: toDocumentId(space, sessionId, event.id),
          },
        },
        {
          '@timestamp': timestamp,
          event_at: event.event_at,
          id: event.id,
          ...(event.seq !== undefined && { seq: event.seq }),
          space,
          ai_index_id: aiIndexIds,
          session_id: sessionId,
          round_id: event.round_id,
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
