/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { updateSignificantEventStatus } from './update_event_status';
import { EventClient } from './event_client';
import type { SignificantEvent } from './data_stream';

const createSignificantEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'agent-event-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
  ...overrides,
});

/**
 * @param hits - results returned for the first esql query (findByEventUuid)
 * @param lineageHits - when provided, returned for the second query (findByEventId);
 *   when omitted both queries return the same `hits` (backward-compat behaviour).
 */
const createEventClient = (hits: SignificantEvent[], lineageHits?: SignificantEvent[]) => {
  const okResponse = { errors: false, items: [] } as unknown as BulkResponse;
  const dataStreamClient = { create: jest.fn().mockResolvedValue(okResponse) };

  const makeResult = (h: SignificantEvent[]) => ({
    columns: [{ name: '_source' }],
    values: h.map((event) => [{ ...event }]),
  });

  const queryMock = jest.fn().mockResolvedValue(makeResult(hits));
  if (lineageHits !== undefined) {
    // Sequence the two internal esql calls: findByEventUuid first, findByEventId second.
    queryMock
      .mockResolvedValueOnce(makeResult(hits))
      .mockResolvedValueOnce(makeResult(lineageHits));
  }

  const esClient = { esql: { query: queryMock } };
  const client = new EventClient({
    dataStreamClient: dataStreamClient as never,
    esClient: esClient as never,
    space: 'default',
  });
  return { client, dataStreamClient };
};

describe('updateSignificantEventStatus', () => {
  it('creates a new event version when status changes', async () => {
    const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'open' });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventUuid: 'event-1',
      status: 'closed',
    });

    expect(result).toEqual({
      event_uuid: result.event_uuid,
      updated: 1,
      ignored: 0,
      status: 'closed',
    });
    expect(result.event_uuid).not.toBe('event-1');

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.status).toBe('closed');
    expect(written.previous_event_uuid).toBe('event-1');
    expect(written.event_uuid).not.toBe('event-1');
    // Written with `refresh: 'wait_for'` so an immediate re-read (e.g. the UI's post-mutation
    // refetch) sees this version rather than resurfacing the previous one.
    expect(callArg.refresh).toBe('wait_for');
  });

  it('ignores when the event is not found', async () => {
    const { client, dataStreamClient } = createEventClient([]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventUuid: 'missing-event',
      status: 'closed',
    });

    expect(result).toEqual({
      event_uuid: 'missing-event',
      updated: 0,
      ignored: 1,
      status: 'closed',
    });
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('ignores when the status is unchanged', async () => {
    const existing = createSignificantEvent({ event_uuid: 'event-1', status: 'closed' });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventUuid: 'event-1',
      status: 'closed',
    });

    expect(result).toEqual({ event_uuid: 'event-1', updated: 0, ignored: 1, status: 'closed' });
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('resolves lineage: update targets the latest event_id version, not a stale caller reference', async () => {
    const e0 = createSignificantEvent({
      event_uuid: 'event-0',
      event_id: 'event-id-1',
      status: 'open',
    });
    const e1 = createSignificantEvent({
      event_uuid: 'event-1',
      event_id: 'event-id-1',
      previous_event_uuid: 'event-0',
      '@timestamp': '2026-01-01T00:01:00.000Z',
      status: 'dismissed',
    });
    // findByEventUuid returns only E0 (the stale ref); findByEventId returns the full lineage
    const { client, dataStreamClient } = createEventClient([e0], [e0, e1]);

    const result = await updateSignificantEventStatus({
      eventClient: client,
      eventUuid: 'event-0',
      status: 'closed',
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Must chain off E1 (the true latest), not E0 (the stale caller reference)
    expect(written.previous_event_uuid).toBe('event-1');
    expect(written.status).toBe('closed');
  });
});
