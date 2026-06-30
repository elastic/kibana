/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SigEventInvestigation } from '@kbn/streams-schema';
import { attachInvestigationToEvent } from './attach_investigation';
import { EventClient } from './event_client';
import type { SignificantEvent } from './data_stream';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  event_id: 'event-1',
  discovery_slug: 'agent-event-1',
  status: 'promoted',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  root_cause: 'Test root cause',
  criticality: 50,
  confidence: 0.8,
  recommendations: ['Investigate the test signal'],
  ...overrides,
});

const createInvestigation = (
  overrides: Partial<SigEventInvestigation> = {}
): SigEventInvestigation => ({
  workflow_execution_id: 'exec-1',
  status: 'pending',
  started_at: '2026-01-01T01:00:00.000Z',
  ...overrides,
});

const createEventClient = (hits: SignificantEvent[]) => {
  const okResponse = { errors: false, items: [] } as unknown as BulkResponse;
  const dataStreamClient = { create: jest.fn().mockResolvedValue(okResponse) };
  const esClient = {
    esql: {
      query: jest.fn().mockResolvedValue({
        columns: [{ name: '_source' }],
        values: hits.map((h) => [{ ...h }]),
      }),
    },
  };
  const client = new EventClient({
    dataStreamClient: dataStreamClient as never,
    esClient: esClient as never,
    space: 'default',
  });
  return { client, dataStreamClient };
};

describe('attachInvestigationToEvent', () => {
  it('appends a new investigation entry and creates a new event version', async () => {
    const existing = createEvent({ event_id: 'event-1' });
    const { client, dataStreamClient } = createEventClient([existing]);
    const investigation = createInvestigation();

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventId: 'event-1',
      investigation,
    });

    expect(result.updated).toBe(1);
    expect(result.ignored).toBe(0);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.investigations).toEqual([investigation]);
    expect(written.previous_event_id).toBe('event-1');
    expect(written.event_id).not.toBe('event-1');
  });

  it('replaces a pending entry with a terminal one, preserving started_at', async () => {
    const pending = createInvestigation({ status: 'pending' });
    const existing = createEvent({ event_id: 'event-1', investigations: [pending] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const terminal = createInvestigation({
      status: 'success',
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventId: 'event-1',
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Only one entry — replaced, not duplicated
    expect(written.investigations).toHaveLength(1);
    expect(written.investigations![0].status).toBe('success');
    expect(written.investigations![0].started_at).toBe(pending.started_at);
    expect(written.investigations![0].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });

  it('replaces by workflow_execution_id: different executions produce two entries', async () => {
    const first = createInvestigation({ workflow_execution_id: 'exec-1' });
    const existing = createEvent({ event_id: 'event-1', investigations: [first] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const second = createInvestigation({ workflow_execution_id: 'exec-2' });
    await attachInvestigationToEvent({
      eventClient: client,
      eventId: 'event-1',
      investigation: second,
    });

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SigEvent = callArg.documents[0];

    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
  });

  it('is idempotent: ignores when the entry is identical', async () => {
    const investigation = createInvestigation();
    const existing = createEvent({ event_id: 'event-1', investigations: [investigation] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventId: 'event-1',
      investigation,
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('returns ignored when the event is not found', async () => {
    const { client, dataStreamClient } = createEventClient([]);

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventId: 'missing-event',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('carries forward the previous_event_id lineage', async () => {
    const existing = createEvent({ event_id: 'event-3', previous_event_id: 'event-2' });
    const { client } = createEventClient([existing]);

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventId: 'event-3',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(1);
    expect(result.event_id).not.toBe('event-3');
  });
});
