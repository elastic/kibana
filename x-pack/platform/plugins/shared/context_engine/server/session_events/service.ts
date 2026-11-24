/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkResponseItem,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SESSION_EVENTS_DATA_STREAM } from './data_streams';
import type {
  ReadSessionTurnsResult,
  SaveEventResult,
  SessionEventInput,
  SessionEventsScope,
  SessionEventsService,
  SessionTurn,
  StoredSessionEvent,
  StoredSessionEventTypeFields,
} from './types';

const assertScope = ({ space, userId }: SessionEventsScope): void => {
  if (space.trim() === '') {
    throw new Error('Session events scope requires a non-empty space');
  }
  if (userId.trim() === '') {
    throw new Error('Session events scope requires a non-empty userId');
  }
};

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
    default: {
      const exhaustive: never = event;
      throw new Error(`Unsupported session event type: ${JSON.stringify(exhaustive)}`);
    }
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

const TURNS_LOAD_CONCURRENCY = 10;
const MAX_TURN_EVENTS_LOADED = 1000;

const turnKey = (sessionId: string, turnId: string): string => `${sessionId}\u0000${turnId}`;

const sortEvents = (events: StoredSessionEvent[]): StoredSessionEvent[] =>
  events.every(({ seq }) => seq !== undefined)
    ? [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || compareEvents(a, b))
    : [...events].sort(compareEvents);

const compareEvents = (a: StoredSessionEvent, b: StoredSessionEvent): number => {
  return (
    Date.parse(a.event_at) - Date.parse(b.event_at) ||
    Date.parse(a['@timestamp']) - Date.parse(b['@timestamp'])
  );
};

const withoutResent = (events: StoredSessionEvent[]): StoredSessionEvent[] => {
  const seen = new Set<string>();
  return [...events]
    .sort((a, b) => Date.parse(a['@timestamp']) - Date.parse(b['@timestamp']))
    .filter(({ id }) => !seen.has(id) && !!seen.add(id));
};

/** `esClient` must send the product origin that system data streams require, as core's clients do. */
export const createSessionEventsService = (
  esClient: ElasticsearchClient
): SessionEventsService => ({
  saveEvents: async (scope, { sessionId, aiIndexIds = [], events }) => {
    assertScope(scope);
    if (events.length === 0) {
      return { results: [] };
    }

    const { space, userId } = scope;

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

  readTurns: async ({ space, aiIndexId, since, after, until, size }) => {
    if (space.trim() === '') {
      throw new Error('Reading session events requires a non-empty space');
    }
    const ownedFilter: QueryDslQueryContainer[] = [
      { term: { space } },
      { term: { ai_index_id: aiIndexId } },
    ];
    const found = await esClient.search<StoredSessionEvent>({
      index: SESSION_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      allow_partial_search_results: false,
      size,
      sort: [{ '@timestamp': 'asc' }, { session_id: 'asc' }, { id: 'asc' }],
      ...(after && { search_after: [Date.parse(since), after.sessionId, after.eventId] }),
      _source: ['@timestamp', 'session_id', 'turn_id', 'id'],
      query: {
        bool: {
          filter: [
            ...ownedFilter,
            {
              range: {
                '@timestamp': after ? { gte: since, lte: until } : { gt: since, lte: until },
              },
            },
          ],
        },
      },
    });
    const positions = found.hits.hits.flatMap(({ _source }) =>
      _source
        ? [
            {
              savedAt: _source['@timestamp'],
              sessionId: _source.session_id,
              eventId: _source.id,
              turnId: _source.turn_id,
            },
          ]
        : []
    );

    const turnPairs = new Map<string, { sessionId: string; turnId: string }>();
    for (const { sessionId, turnId } of positions) {
      turnPairs.set(turnKey(sessionId, turnId), { sessionId, turnId });
    }
    const pairs = [...turnPairs.values()];
    const untilMs = Date.parse(until);
    const turns: SessionTurn[] = [];
    for (let start = 0; start < pairs.length; start += TURNS_LOAD_CONCURRENCY) {
      const loaded = await Promise.all(
        pairs.slice(start, start + TURNS_LOAD_CONCURRENCY).map(async ({ sessionId, turnId }) => {
          const response = await esClient.search<StoredSessionEvent>({
            index: SESSION_EVENTS_DATA_STREAM,
            ignore_unavailable: true,
            allow_partial_search_results: false,
            size: MAX_TURN_EVENTS_LOADED,
            sort: [{ '@timestamp': 'asc' }],
            query: {
              bool: {
                filter: [
                  ...ownedFilter,
                  { term: { session_id: sessionId } },
                  { term: { turn_id: turnId } },
                ],
              },
            },
          });
          return {
            sessionId,
            turnId,
            stored: response.hits.hits.flatMap(({ _source }) => _source ?? []),
          };
        })
      );
      for (const { sessionId, turnId, stored } of loaded) {
        const settled = stored.every((event) => Date.parse(event['@timestamp']) <= untilMs);
        if (stored.length > 0 && settled) {
          turns.push({
            sessionId,
            turnId,
            endedAt: stored.reduce(
              (latest, event) => (event['@timestamp'] > latest ? event['@timestamp'] : latest),
              stored[0]['@timestamp']
            ),
            events: sortEvents(withoutResent(stored)),
          });
        }
      }
    }
    const result: ReadSessionTurnsResult = { positions, turns, full: positions.length === size };
    return result;
  },
});
