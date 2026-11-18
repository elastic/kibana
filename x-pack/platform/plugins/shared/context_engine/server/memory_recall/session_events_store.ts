/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_CANDIDATES } from '../../common/constants';
import { SESSION_EVENTS_DATA_STREAM } from '../session_events/data_streams';
import type { RecallCandidate, RecallStore } from './types';
import { sessionScopeFilter } from './session_memory_store';

const LIMIT = RECALL_CANDIDATES.session_events;
// Resent events are stored again, so over-fetch to keep LIMIT after dropping duplicates.
const OVERFETCH_FACTOR = 2;

/** Only user and assistant events carry indexed content. */
interface RecalledEventSource {
  id: string;
  session_id: string;
  event_at: string;
  type: 'user' | 'assistant';
  content: string;
}

/** Searches session events as the internal user, since users cannot read the system data stream. */
export const createSessionEventsRecallStore = ({
  esClient,
  space,
}: {
  esClient: ElasticsearchClient;
  space: string;
}): RecallStore => ({
  source: 'session_events',
  search: async ({ query, userId, sessionIds }) => {
    const response = await esClient.search<RecalledEventSource>({
      index: SESSION_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      query: {
        bool: {
          must: [{ match: { 'content.semantic_text': { query } } }],
          filter: [
            ...sessionScopeFilter(space, { userId, sessionIds }),
            { terms: { type: ['user', 'assistant'] } },
          ],
        },
      },
      _source: ['id', 'session_id', 'event_at', 'type', 'content'],
      size: LIMIT * OVERFETCH_FACTOR,
    });

    // Hits come best first, so the first copy of a resent event is the one kept.
    const seen = new Set<string>();
    return response.hits.hits
      .flatMap(({ _source }): RecallCandidate[] => {
        const key = _source && JSON.stringify([_source.session_id, _source.id]);
        if (!_source || !key || seen.has(key) || typeof _source.content !== 'string') {
          return [];
        }
        seen.add(key);
        return [
          {
            id: _source.id,
            source: 'session_events',
            content: _source.content,
            date: _source.event_at,
            role: _source.type,
            session_id: _source.session_id,
          },
        ];
      })
      .slice(0, LIMIT);
  },
});
