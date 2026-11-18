/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createSessionEventsRecallStore } from './session_events_store';
import { createSessionMemoryRecallStore } from './session_memory_store';

const hits = (sources: Array<Record<string, unknown>>) => ({
  hits: { hits: sources.map((_source) => ({ _source })) },
});

describe('session recall stores', () => {
  let search: jest.Mock;
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    search = jest.fn();
    esClient = { search } as unknown as ElasticsearchClient;
  });

  it('returns nothing without a user', async () => {
    const params = { query: 'why was checkout slow?' };

    expect(
      await createSessionMemoryRecallStore({ esClient, space: 'default' }).search(params)
    ).toEqual([]);
    expect(
      await createSessionEventsRecallStore({ esClient, space: 'default' }).search(params)
    ).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('returns the latest revision of each matched memory and drops forgotten ones', async () => {
    search.mockResolvedValueOnce(hits([{ id: 'm-1' }, { id: 'm-2' }])).mockResolvedValueOnce(
      hits([
        { id: 'm-1', session_id: 's-1', content: 'revised', '@timestamp': '2026-11-18T10:00:00Z' },
        { id: 'm-2', session_id: 's-1', deleted_at: '2026-11-18T10:01:00Z' },
      ])
    );

    const results = await createSessionMemoryRecallStore({ esClient, space: 'default' }).search({
      query: 'why was checkout slow?',
      userId: 'u-1',
    });

    expect(results).toEqual([
      {
        id: 'm-1',
        source: 'session_memory',
        content: 'revised',
        date: '2026-11-18T10:00:00Z',
        session_id: 's-1',
      },
    ]);
  });

  it('drops resent events and fills role and session id', async () => {
    const event = {
      id: 'e-1',
      session_id: 's-1',
      type: 'user',
      content: 'checkout is slow',
      event_at: '2026-11-18T10:00:00Z',
    };
    search.mockResolvedValueOnce(hits([event, event, { ...event, session_id: 's-2' }]));

    const results = await createSessionEventsRecallStore({ esClient, space: 'default' }).search({
      query: 'why was checkout slow?',
      userId: 'u-1',
    });

    expect(results.map(({ session_id: sessionId, role }) => ({ sessionId, role }))).toEqual([
      { sessionId: 's-1', role: 'user' },
      { sessionId: 's-2', role: 'user' },
    ]);
  });
});
