/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { EsTestCluster } from '@kbn/test';
import { createEsClientForTesting, createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { SESSION_EVENTS_DATA_STREAM } from '../data_streams';
import { createSessionEventsService } from '../service';
import type { SessionEventInput, SessionEventsService, StoredSessionEvent } from '../types';

describe('session events', () => {
  jest.setTimeout(180_000);

  let esServer: EsTestCluster;
  let esClient: ReturnType<typeof createEsClientForTesting>;
  let service: SessionEventsService;

  const jdoe = { space: 'default', userId: 'jdoe' };
  const base = { round_id: 'round-1', event_at: '2026-11-16T09:59:00.000Z' };

  const expectedId = (space: string, sessionId: string, id: string) =>
    createHash('sha256')
      .update(JSON.stringify([space, sessionId, id]))
      .digest('hex');

  const readSession = async (sessionId: string) => {
    await esClient.indices.refresh({ index: SESSION_EVENTS_DATA_STREAM });
    const response = await esClient.search<StoredSessionEvent>({
      index: SESSION_EVENTS_DATA_STREAM,
      query: { term: { session_id: sessionId } },
      sort: [{ seq: 'asc' }],
      size: 100,
    });
    return response.hits.hits.map(({ _id, _source }) => ({ _id, _source }));
  };

  const countEvents = async (query: Record<string, string>) => {
    await esClient.indices.refresh({ index: SESSION_EVENTS_DATA_STREAM });
    const { count } = await esClient.count({
      index: SESSION_EVENTS_DATA_STREAM,
      query: {
        bool: {
          filter: Object.entries(query).map(([field, value]) => ({ term: { [field]: value } })),
        },
      },
    });
    return count;
  };

  // Writing `content` runs semantic_text inference, which the test cluster's basic license does not
  // allow. The round trips use events without content.
  const toolCall: SessionEventInput = {
    ...base,
    type: 'assistant',
    id: 'call',
    seq: 1,
    tool_calls: [
      { id: 'call-1', name: 'search', args: '{"index":"logs"}' },
      { id: 'call-2', name: 'search', args: '{"index":"metrics"}' },
    ],
  };
  const toolResult: SessionEventInput = {
    ...base,
    type: 'tool',
    id: 'result',
    seq: 2,
    tool_call_id: 'call-1',
    tool_name: 'search',
    result: 'connection pool exhausted',
    ok: false,
  };
  const meta = {
    ...base,
    type: 'meta' as const,
    id: 'meta',
    seq: 3,
    harness: { name: 'claude-code', cwd: '/srv/checkout' },
  };
  const batch: SessionEventInput[] = [toolCall, toolResult, meta];

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    esClient = createEsClientForTesting({
      esUrl: esServer.getHostUrls()[0],
      headers: { 'x-elastic-product-origin': 'kibana' },
    });
    service = createSessionEventsService(esClient);
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('stores every mapped field of each event under its hashed id', async () => {
    const { results } = await service.saveEvents(jdoe, {
      sessionId: 'session-1',
      aiIndexIds: ['ops-memory'],
      events: batch,
    });
    expect(results).toEqual([
      { id: 'call', status: 'created' },
      { id: 'result', status: 'created' },
      { id: 'meta', status: 'created' },
    ]);

    const scopeFields = {
      '@timestamp': expect.any(String),
      event_at: base.event_at,
      space: 'default',
      ai_index_id: ['ops-memory'],
      session_id: 'session-1',
      round_id: 'round-1',
      user_id: 'jdoe',
    };
    expect(await readSession('session-1')).toEqual([
      {
        _id: expectedId('default', 'session-1', 'call'),
        _source: {
          ...scopeFields,
          id: 'call',
          seq: 1,
          type: 'assistant',
          tool_name: ['search'],
          raw: toolCall,
        },
      },
      {
        _id: expectedId('default', 'session-1', 'result'),
        _source: {
          ...scopeFields,
          id: 'result',
          seq: 2,
          type: 'tool',
          tool_name: 'search',
          ok: false,
          raw: toolResult,
        },
      },
      {
        _id: expectedId('default', 'session-1', 'meta'),
        _source: { ...scopeFields, id: 'meta', seq: 3, type: 'meta', raw: meta },
      },
    ]);
  });

  it('keeps the first write of a resent batch', async () => {
    const input = { sessionId: 'session-resent', events: batch };
    await service.saveEvents(jdoe, input);
    const firstWrite = await readSession('session-resent');

    const { results } = await service.saveEvents(jdoe, input);

    expect(results.map(({ status }) => status)).toEqual([
      'already_stored',
      'already_stored',
      'already_stored',
    ]);
    expect(await readSession('session-resent')).toEqual(firstWrite);
  });

  it('stores the same event id once per session', async () => {
    const event: SessionEventInput = { ...base, type: 'meta', id: 'shared-id' };

    const [first, second] = await Promise.all([
      service.saveEvents(jdoe, { sessionId: 'session-a', events: [event] }),
      service.saveEvents(jdoe, { sessionId: 'session-b', events: [event] }),
    ]);

    expect([...first.results, ...second.results]).toEqual([
      { id: 'shared-id', status: 'created' },
      { id: 'shared-id', status: 'created' },
    ]);
    expect(await countEvents({ id: 'shared-id' })).toBe(2);
  });

  it('reports an event that Elasticsearch rejects without failing the batch', async () => {
    const { results } = await service.saveEvents(jdoe, {
      sessionId: 'session-rejected',
      events: [
        { ...base, type: 'user', id: 'question', content: 'Why is checkout slow?' },
        { ...base, type: 'meta', id: 'meta' },
      ],
    });

    expect(results).toEqual([
      { id: 'question', status: 'failed', error: expect.stringMatching(/inference|license/i) },
      { id: 'meta', status: 'created' },
    ]);
    expect(await countEvents({ session_id: 'session-rejected' })).toBe(1);
  });
});
