/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
  type SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import { attachInvestigationToEvent } from './attach_investigation';
import { EventClient } from './event_client';
import type { SignificantEvent } from './data_stream';
import {
  EVENT_STATUS_CHANGED_TRIGGER_ID,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
} from '../../../../common/workflows/triggers';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
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

const createInvestigation = (
  overrides: Partial<SignificantEventInvestigation> = {}
): SignificantEventInvestigation => ({
  workflow_execution_id: 'exec-1',
  started_at: '2026-01-01T01:00:00.000Z',
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
  const triggerEmitter = jest.fn();
  const client = new EventClient({
    dataStreamClient: dataStreamClient as never,
    esClient: esClient as never,
    space: 'default',
    triggerEmitter,
  });
  return { client, dataStreamClient, triggerEmitter };
};

describe('attachInvestigationToEvent', () => {
  it('appends a new investigation entry and creates a new event version', async () => {
    const existing = createEvent({ event_uuid: 'event-1' });
    const { client, dataStreamClient } = createEventClient([existing]);
    const investigation = createInvestigation();

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation,
    });

    expect(result.updated).toBe(1);
    expect(result.ignored).toBe(0);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.investigations).toEqual([investigation]);
    expect(written.previous_event_uuid).toBe('event-1');
    expect(written.event_uuid).not.toBe('event-1');
    expect(written.workflow_execution_id).toBe(investigation.workflow_execution_id);
  });

  it('attaches an investigation to a legacy event with longer narratives', async () => {
    const existing = createEvent({
      event_uuid: 'event-1',
      symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1),
      summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1),
      assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1),
    });
    const { client, dataStreamClient } = createEventClient([existing]);

    await expect(
      attachInvestigationToEvent({
        eventClient: client,
        eventUuid: 'event-1',
        investigation: createInvestigation(),
      })
    ).resolves.toMatchObject({ updated: 1 });

    expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
  });

  it('replaces a pending entry with a terminal one, preserving started_at', async () => {
    const pending = createInvestigation();
    const existing = createEvent({ event_uuid: 'event-1', investigations: [pending] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const terminal = createInvestigation({
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Only one entry — replaced, not duplicated
    expect(written.investigations).toHaveLength(1);
    expect(written.investigations![0].started_at).toBe(pending.started_at);
    expect(written.investigations![0].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });

  it('replaces by workflow_execution_id: different executions produce two entries', async () => {
    const first = createInvestigation({
      workflow_execution_id: 'exec-1',
      completed_at: '2026-01-01T01:30:00.000Z',
    });
    const existing = createEvent({ event_uuid: 'event-1', investigations: [first] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const second = createInvestigation({ workflow_execution_id: 'exec-2' });
    await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation: second,
    });

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
  });

  it('is idempotent: ignores when the entry is identical', async () => {
    const investigation = createInvestigation();
    const existing = createEvent({ event_uuid: 'event-1', investigations: [investigation] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
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
      eventUuid: 'missing-event',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('carries forward the previous_event_uuid lineage', async () => {
    const existing = createEvent({ event_uuid: 'event-3', previous_event_uuid: 'event-2' });
    const { client } = createEventClient([existing]);

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-3',
      investigation: createInvestigation(),
    });

    expect(result.updated).toBe(1);
    expect(result.event_uuid).not.toBe('event-3');
  });

  it('reconciles orphaned running entries from cancelled runs when a new execution attaches', async () => {
    /**
     * Regression for cancel-in-progress orphan: R1 writes a running entry (exec-1); R2 is
     * triggered, cancelling R1 via cancel-in-progress; R1 never reaches its terminal step so
     * exec-1 stays without a `completed_at` in the array. When R2's running attach arrives
     * (exec-2), exec-1 must get a `completed_at` stamped so hasRunningInvestigation stops
     * returning true for it and the UI stops polling.
     */
    const orphaned = createInvestigation({ workflow_execution_id: 'exec-1' });
    const existing = createEvent({ event_uuid: 'event-1', investigations: [orphaned] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const incoming = createInvestigation({ workflow_execution_id: 'exec-2' });
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation: incoming,
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![0].completed_at).toBeDefined();
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
    expect(written.investigations![1].completed_at).toBeUndefined();
  });

  it('reconciles orphaned running entries when a terminal attach arrives for a new execution', async () => {
    const orphaned = createInvestigation({ workflow_execution_id: 'exec-1' });
    const existing = createEvent({ event_uuid: 'event-1', investigations: [orphaned] });
    const { client, dataStreamClient } = createEventClient([existing]);

    const terminal = createInvestigation({
      workflow_execution_id: 'exec-2',
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Both entries present; orphaned run resolved with a completed_at, none left running
    expect(written.investigations).toHaveLength(2);
    expect(written.investigations![0].workflow_execution_id).toBe('exec-1');
    expect(written.investigations![0].completed_at).toBeDefined();
    expect(written.investigations![1].workflow_execution_id).toBe('exec-2');
    expect(written.investigations![1].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });

  it('does not exceed the 100-entry cap: ignores a new entry when already at 100 investigations', async () => {
    const fullInvestigations = Array.from({ length: 100 }, (_, i) =>
      createInvestigation({
        workflow_execution_id: `exec-${i}`,
        completed_at: '2026-01-01T01:30:00.000Z',
      })
    );
    const existing = createEvent({ event_uuid: 'event-1', investigations: fullInvestigations });
    const { client, dataStreamClient } = createEventClient([existing]);

    const newInvestigation = createInvestigation({ workflow_execution_id: 'exec-100' });
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation: newInvestigation,
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('applies reassessed fields in the same version as the completed investigation', async () => {
    const existing = createEvent({ event_uuid: 'event-1', severity: '40-medium', status: 'open' });
    const { client, dataStreamClient } = createEventClient([existing]);
    const investigation = createInvestigation({ completed_at: '2026-01-01T02:00:00.000Z' });

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation,
      reassessedFields: { severity: '80-critical' },
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Single version carries both the investigation entry and the reassessed field.
    expect(written.investigations).toEqual([investigation]);
    expect(written.severity).toBe('80-critical');
    expect(written.status).toBe('open');
    expect(written.workflow_execution_id).toBe(investigation.workflow_execution_id);
  });

  it('writes a field-only change even when the investigation entry is unchanged', async () => {
    const investigation = createInvestigation({ completed_at: '2026-01-01T02:00:00.000Z' });
    const existing = createEvent({
      event_uuid: 'event-1',
      severity: '40-medium',
      investigations: [investigation],
    });
    const { client, dataStreamClient } = createEventClient([existing]);

    // Same investigation entry (idempotent attach) but a genuinely new severity.
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation,
      reassessedFields: { severity: '80-critical' },
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    expect(written.investigations).toHaveLength(1);
    expect(written.severity).toBe('80-critical');
  });

  it('ignores when neither the investigation entry nor the reassessed fields changed', async () => {
    const investigation = createInvestigation({ completed_at: '2026-01-01T02:00:00.000Z' });
    const existing = createEvent({
      event_uuid: 'event-1',
      severity: '40-medium',
      investigations: [investigation],
    });
    const { client, dataStreamClient } = createEventClient([existing]);

    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation,
      reassessedFields: { severity: '40-medium' },
    });

    expect(result.updated).toBe(0);
    expect(result.ignored).toBe(1);
    expect(dataStreamClient.create).not.toHaveBeenCalled();
  });

  it('resolves lineage: terminal attach targets the latest event version, not the frozen caller version', async () => {
    /**
     * Regression: the investigation workflow passes the frozen inputs.context.event_uuid (E0) to
     * both its pending and terminal kibana.request steps. Without lineage resolution, findByEventUuid(E0)
     * always returns E0, so the terminal write branches off E0 instead of chaining off the
     * pending-written E1 — producing siblings that lose prior investigation history.
     */
    const pending = createInvestigation({ workflow_execution_id: 'exec-1' });
    const e0 = createEvent({ event_uuid: 'event-0', event_id: 'slug-1' });
    const e1 = createEvent({
      event_uuid: 'event-1',
      event_id: 'slug-1',
      previous_event_uuid: 'event-0',
      '@timestamp': '2026-01-01T00:01:00.000Z',
      investigations: [pending],
    });
    // findByEventUuid returns only E0 (the frozen stale ref); findByEventId returns the full lineage
    const { client, dataStreamClient } = createEventClient([e0], [e0, e1]);

    const terminal = createInvestigation({
      workflow_execution_id: 'exec-1',
      completed_at: '2026-01-01T02:00:00.000Z',
    });
    const result = await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-0', // frozen stale reference as passed by the workflow
      investigation: terminal,
    });

    expect(result.updated).toBe(1);

    const [[callArg]] = dataStreamClient.create.mock.calls;
    const written: SignificantEvent = callArg.documents[0];

    // Must chain off E1 (the true latest), not E0 (the frozen caller reference)
    expect(written.previous_event_uuid).toBe('event-1');
    // Replace-by-execution-id: pending entry replaced with terminal, not duplicated
    expect(written.investigations).toHaveLength(1);
    expect(written.investigations![0].started_at).toBe(pending.started_at);
    expect(written.investigations![0].completed_at).toBe('2026-01-01T02:00:00.000Z');
  });

  it('emits eventStatusChanged when a reassessment changes the status', async () => {
    const existing = createEvent({ event_uuid: 'event-1', status: 'open' });
    const { client, triggerEmitter } = createEventClient([existing]);
    const investigation = createInvestigation({ completed_at: '2026-01-01T02:00:00.000Z' });

    await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation,
      reassessedFields: { status: 'closed' },
    });

    expect(triggerEmitter).toHaveBeenCalledWith(
      EVENT_STATUS_CHANGED_TRIGGER_ID,
      expect.objectContaining({ status: 'closed', previous_status: 'open' })
    );
    expect(triggerEmitter).toHaveBeenCalledWith(
      INVESTIGATION_COMPLETED_TRIGGER_ID,
      expect.objectContaining({ workflow_execution_id: investigation.workflow_execution_id })
    );
  });

  it('does not emit eventStatusChanged when the status is unchanged', async () => {
    const existing = createEvent({ event_uuid: 'event-1', status: 'open' });
    const { client, triggerEmitter } = createEventClient([existing]);
    const investigation = createInvestigation({ completed_at: '2026-01-01T02:00:00.000Z' });

    await attachInvestigationToEvent({
      eventClient: client,
      eventUuid: 'event-1',
      investigation,
      reassessedFields: { severity: '80-critical' },
    });

    expect(triggerEmitter).not.toHaveBeenCalledWith(
      EVENT_STATUS_CHANGED_TRIGGER_ID,
      expect.anything()
    );
  });
});
