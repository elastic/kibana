/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse, BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SESSION_EVENTS_DATA_STREAM } from './data_streams';
import { createSessionEventsService } from './service';
import type { SessionEventInput, SessionEventsScope, StoredSessionEvent } from './types';

const NOW = new Date('2026-11-16T10:00:00.000Z');
const scope: SessionEventsScope = { space: 'default', userId: 'jdoe' };
const base = { round_id: 'round-1', event_at: '2026-11-16T09:59:00.000Z' };

const STRICT_TEMPLATE_FIELDS = [
  '@timestamp',
  'event_at',
  'id',
  'seq',
  'space',
  'ai_index_id',
  'session_id',
  'round_id',
  'user_id',
  'type',
  'content',
  'tool_name',
  'ok',
  'raw',
];

const created: BulkResponseItem = { _index: '.ds-events', status: 201, result: 'created' };
const conflict: BulkResponseItem = {
  _index: '.ds-events',
  status: 409,
  error: {
    type: 'version_conflict_engine_exception',
    reason: 'version conflict, document already exists (current version [1])',
  },
};
const inferenceFailure: BulkResponseItem = {
  _index: '.ds-events',
  status: 400,
  error: { type: 'inference_exception', reason: 'Inference endpoint is unavailable' },
};

const bulkResponse = (items: BulkResponseItem[]): BulkResponse => ({
  errors: items.some(({ error }) => error !== undefined),
  took: 1,
  items: items.map((create) => ({ create })),
});

describe('createSessionEventsService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const service = createSessionEventsService(esClient);

  const save = async (
    events: readonly SessionEventInput[],
    { sessionId = 'session-1', aiIndexIds = ['ops-memory'], saveScope = scope } = {}
  ) => {
    esClient.bulk.mockResolvedValueOnce(bulkResponse(events.map(() => created)));
    const { results } = await service.saveEvents(saveScope, { sessionId, aiIndexIds, events });
    const [request] = esClient.bulk.mock.calls[esClient.bulk.mock.calls.length - 1];
    const operations = request.operations ?? [];
    const actions = operations.filter((_, index) => index % 2 === 0) as Array<{
      create: { _index: string; _id: string };
    }>;
    return {
      request,
      results,
      actions,
      ids: actions.map(({ create }) => create._id),
      documents: operations.filter((_, index) => index % 2 === 1) as StoredSessionEvent[],
    };
  };

  const saveOne = async (event: SessionEventInput): Promise<StoredSessionEvent> => {
    const { documents } = await save([event]);
    return documents[0];
  };

  const documentId = async (
    eventId: string,
    options: { sessionId?: string; saveScope?: SessionEventsScope } = {}
  ) => {
    const { ids } = await save([{ ...base, type: 'meta', id: eventId }], options);
    return ids[0];
  };

  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    esClient.bulk.mockReset();
  });

  it('writes one document per event from the scope, the input and the event', async () => {
    const event: SessionEventInput = {
      ...base,
      type: 'tool',
      id: 'event-1',
      seq: 3,
      tool_call_id: 'call-1',
      tool_name: 'search',
      result: '{"hits":2}',
      ok: true,
    };

    expect(await saveOne(event)).toEqual({
      '@timestamp': NOW.toISOString(),
      event_at: base.event_at,
      id: 'event-1',
      seq: 3,
      space: 'default',
      ai_index_id: ['ops-memory'],
      session_id: 'session-1',
      round_id: 'round-1',
      user_id: 'jdoe',
      type: 'tool',
      tool_name: 'search',
      ok: true,
      raw: event,
    });
  });

  it('sends one bulk request of create operations without a refresh', async () => {
    const { request, actions } = await save([
      { ...base, type: 'meta', id: 'event-1' },
      { ...base, type: 'meta', id: 'event-2' },
    ]);

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(request.refresh).toBeUndefined();
    expect(actions).toEqual([
      {
        create: {
          _index: SESSION_EVENTS_DATA_STREAM,
          _id: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      },
      {
        create: {
          _index: SESSION_EVENTS_DATA_STREAM,
          _id: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      },
    ]);
  });

  it('defaults the AI index ids to none and leaves out a missing seq', async () => {
    esClient.bulk.mockResolvedValueOnce(bulkResponse([created]));
    await service.saveEvents(scope, {
      sessionId: 'session-1',
      events: [{ ...base, type: 'meta', id: 'event-1' }],
    });

    const [document] = (esClient.bulk.mock.calls[0][0].operations ?? []).slice(1);
    expect(document).toMatchObject({ ai_index_id: [] });
    expect(document).not.toHaveProperty('seq');
  });

  describe('content', () => {
    it('is indexed for user and assistant events', async () => {
      expect(
        await saveOne({ ...base, type: 'user', id: 'e1', content: 'Why is it slow?' })
      ).toEqual(expect.objectContaining({ content: 'Why is it slow?' }));
      expect(
        await saveOne({ ...base, type: 'assistant', id: 'e2', content: 'The pool is full.' })
      ).toEqual(expect.objectContaining({ content: 'The pool is full.' }));
    });

    it('is kept only in raw for reasoning events', async () => {
      const event: SessionEventInput = {
        ...base,
        type: 'reasoning',
        id: 'e1',
        content: 'Check the pool first.',
      };
      const document = await saveOne(event);

      expect(document).not.toHaveProperty('content');
      expect(document.raw).toEqual(event);
    });

    it('is left out of an assistant event without content', async () => {
      expect(await saveOne({ ...base, type: 'assistant', id: 'e1' })).not.toHaveProperty('content');
    });
  });

  describe('tool_name', () => {
    it('lists each tool an assistant event calls once', async () => {
      const document = await saveOne({
        ...base,
        type: 'assistant',
        id: 'e1',
        content: 'Searching both indices.',
        tool_calls: [
          { id: 'call-1', name: 'search', args: '{"index":"logs"}' },
          { id: 'call-2', name: 'search', args: '{"index":"metrics"}' },
          { id: 'call-3', name: 'fetch' },
        ],
      });

      expect(document).toHaveProperty('tool_name', ['search', 'fetch']);
      expect(document).toHaveProperty('content', 'Searching both indices.');
    });

    it('is left out of an assistant event without calls', async () => {
      expect(await saveOne({ ...base, type: 'assistant', id: 'e1' })).not.toHaveProperty(
        'tool_name'
      );
      expect(
        await saveOne({ ...base, type: 'assistant', id: 'e2', tool_calls: [] })
      ).not.toHaveProperty('tool_name');
    });

    it("is the tool event's own tool name", async () => {
      const document = await saveOne({
        ...base,
        type: 'tool',
        id: 'e1',
        tool_call_id: 'call-from-an-earlier-request',
        tool_name: 'fetch',
      });

      expect(document).toHaveProperty('tool_name', 'fetch');
    });
  });

  describe('ok', () => {
    it.each([true, false, null])('keeps %p on a tool event', async (ok) => {
      const document = await saveOne({
        ...base,
        type: 'tool',
        id: 'e1',
        tool_call_id: 'call-1',
        tool_name: 'search',
        ok,
      });

      expect(document).toHaveProperty('ok', ok);
    });

    it('is left out of a tool event without an outcome', async () => {
      expect(
        await saveOne({ ...base, type: 'tool', id: 'e1', tool_call_id: 'c1', tool_name: 'search' })
      ).not.toHaveProperty('ok');
    });
  });

  it('keeps extra fields in raw only', async () => {
    const event = {
      ...base,
      type: 'meta' as const,
      id: 'e1',
      harness: { name: 'claude-code', version: '2.1.0' },
      content: 'not indexed on a meta event',
      ok: true,
      tool_name: 'not indexed either',
    };
    const document = await saveOne(event);

    expect(document.raw).toEqual(event);
    expect(STRICT_TEMPLATE_FIELDS).toEqual(expect.arrayContaining(Object.keys(document)));
    expect(document).not.toHaveProperty('content');
    expect(document).not.toHaveProperty('ok');
    expect(document).not.toHaveProperty('tool_name');
  });

  describe('_id', () => {
    it('is the same for the same event in the same session', async () => {
      expect(await documentId('e1')).toBe(await documentId('e1'));
    });

    it('differs for the same event id in another session or space', async () => {
      const ids = [
        await documentId('e1'),
        await documentId('e1', { sessionId: 'session-2' }),
        await documentId('e1', { saveScope: { ...scope, space: 'other-space' } }),
      ];

      expect(new Set(ids).size).toBe(3);
    });
  });

  it('reports each event as created, already stored or failed, in order', async () => {
    esClient.bulk.mockResolvedValueOnce(bulkResponse([created, conflict, inferenceFailure]));

    const { results } = await service.saveEvents(scope, {
      sessionId: 'session-1',
      events: [
        { ...base, type: 'meta', id: 'first' },
        { ...base, type: 'meta', id: 'second' },
        { ...base, type: 'user', id: 'third', content: 'Why is it slow?' },
      ],
    });

    expect(results).toEqual([
      { id: 'first', status: 'created' },
      { id: 'second', status: 'already_stored' },
      { id: 'third', status: 'failed', error: 'Inference endpoint is unavailable' },
    ]);
  });

  it('makes no request for an empty batch', async () => {
    await expect(
      service.saveEvents(scope, { sessionId: 'session-1', events: [] })
    ).resolves.toEqual({ results: [] });
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('throws when the whole request fails', async () => {
    esClient.bulk.mockRejectedValueOnce(new Error('no_shard_available_action_exception'));

    await expect(
      service.saveEvents(scope, {
        sessionId: 'session-1',
        events: [{ ...base, type: 'meta', id: 'e1' }],
      })
    ).rejects.toThrow('no_shard_available_action_exception');
  });
});
