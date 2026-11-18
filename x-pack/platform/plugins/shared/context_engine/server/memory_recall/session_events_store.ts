/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_CANDIDATES } from '../../common/constants';
import { SESSION_EVENTS_DATA_STREAM } from '../session_events/data_streams';
import type { StoredSessionEvent } from '../session_events/types';
import type { RecallCandidate, RecallStore } from './types';

const LIMIT = RECALL_CANDIDATES.session_events;
/** A resent event is stored again, so fetch extra hits to fill the limit after dropping duplicates. */
const FETCH_SIZE = LIMIT * 2;

type RecalledEvent = Pick<StoredSessionEvent, 'id' | 'session_id' | 'event_at'> & {
  type: 'user' | 'assistant';
  content?: string;
};

/**
 * Searches the user and assistant messages of session events by meaning.
 * `esClient` must send the product origin that system data streams require.
 */
export const createSessionEventsRecallStore = ({
  esClient,
  space,
}: {
  esClient: ElasticsearchClient;
  space: string;
}): RecallStore => ({
  source: 'session_events',
  search: async ({ query, userId, sessionIds }) => {
    if (userId === undefined) {
      return [];
    }
    const filter: QueryDslQueryContainer[] = [
      { term: { space } },
      { term: { user_id: userId } },
      { terms: { type: ['user', 'assistant'] } },
      ...(sessionIds ? [{ terms: { session_id: sessionIds } }] : []),
    ];

    const response = await esClient.search<RecalledEvent>({
      index: SESSION_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      query: { bool: { must: [{ match: { 'content.semantic_text': query } }], filter } },
      _source: ['id', 'session_id', 'event_at', 'type', 'content'],
      size: FETCH_SIZE,
    });

    const seen = new Set<string>();
    return response.hits.hits
      .flatMap(({ _source: event }): RecallCandidate[] => {
        const key = event && `${event.session_id}:${event.id}`;
        if (!event?.content || key === undefined || seen.has(key)) {
          return [];
        }
        seen.add(key);
        return [
          {
            id: event.id,
            source: 'session_events',
            content: event.content,
            date: event.event_at,
            role: event.type,
            session_id: event.session_id,
          },
        ];
      })
      .slice(0, LIMIT);
  },
});
