/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import type { EventClient } from '../../lib/significant_events/events';
import {
  EVENT_CREATED_TRIGGER_ID,
  EVENT_STATUS_CHANGED_TRIGGER_ID,
  INVESTIGATION_STARTED_TRIGGER_ID,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
} from '../../../common/workflows/triggers';
import {
  emitSignificantEventWriteTriggers,
  emitSignificantEventInvestigationTriggers,
} from './emit_significant_event_triggers';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-uuid-1',
  event_id: 'event-id-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
  ...overrides,
});

const createEventClient = () => {
  const emitTrigger = jest.fn();
  return { eventClient: { emitTrigger } as unknown as EventClient, emitTrigger };
};

const investigation = (
  overrides: Partial<SignificantEventInvestigation> = {}
): SignificantEventInvestigation => ({
  workflow_execution_id: 'exec-1',
  started_at: '2026-01-01T01:00:00.000Z',
  ...overrides,
});

describe('emitSignificantEventWriteTriggers', () => {
  it('emits eventCreated when there is no prior version', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();

    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: event,
      priorSignificantEvent: undefined,
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(EVENT_CREATED_TRIGGER_ID, {
      event_id: 'event-id-1',
      event_uuid: 'event-uuid-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'open',
      severity: '40-medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('emits eventStatusChanged with previous_status when the status differs', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent({ status: 'closed' });

    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: event,
      priorSignificantEvent: { status: 'open' },
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(EVENT_STATUS_CHANGED_TRIGGER_ID, {
      event_id: 'event-id-1',
      event_uuid: 'event-uuid-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'closed',
      severity: '40-medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
      previous_status: 'open',
    });
  });

  it('emits nothing when a prior version exists with the same status', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent({ status: 'open' });

    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: event,
      priorSignificantEvent: { status: 'open' },
    });

    expect(emitTrigger).not.toHaveBeenCalled();
  });
});

describe('emitSignificantEventInvestigationTriggers', () => {
  it('emits investigationStarted for a new pending entry', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();

    emitSignificantEventInvestigationTriggers({
      eventClient,
      significantEvent: event,
      previousInvestigations: [],
      nextInvestigations: [investigation()],
      targetedWorkflowExecutionId: 'exec-1',
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(INVESTIGATION_STARTED_TRIGGER_ID, {
      event_id: 'event-id-1',
      event_uuid: 'event-uuid-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'open',
      severity: '40-medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
      workflow_execution_id: 'exec-1',
      started_at: '2026-01-01T01:00:00.000Z',
    });
  });

  it('emits investigationCompleted when the targeted pending entry gets completed_at', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();

    emitSignificantEventInvestigationTriggers({
      eventClient,
      significantEvent: event,
      previousInvestigations: [investigation()],
      nextInvestigations: [investigation({ completed_at: '2026-01-01T02:00:00.000Z' })],
      targetedWorkflowExecutionId: 'exec-1',
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(INVESTIGATION_COMPLETED_TRIGGER_ID, {
      event_id: 'event-id-1',
      event_uuid: 'event-uuid-1',
      title: 'Test event',
      summary: 'Test summary',
      status: 'open',
      severity: '40-medium',
      stream_names: ['logs.test'],
      occurred_at: '2026-01-01T00:00:00.000Z',
      workflow_execution_id: 'exec-1',
      started_at: '2026-01-01T01:00:00.000Z',
      completed_at: '2026-01-01T02:00:00.000Z',
    });
  });

  it('emits investigationCompleted for a new already-completed targeted entry', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();

    emitSignificantEventInvestigationTriggers({
      eventClient,
      significantEvent: event,
      previousInvestigations: [],
      nextInvestigations: [investigation({ completed_at: '2026-01-01T02:00:00.000Z' })],
      targetedWorkflowExecutionId: 'exec-1',
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(
      INVESTIGATION_COMPLETED_TRIGGER_ID,
      expect.objectContaining({ completed_at: '2026-01-01T02:00:00.000Z' })
    );
  });

  it('emits only started for the new run and nothing for a superseded run when a newer run supersedes', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();
    const running = investigation({ workflow_execution_id: 'exec-1' });
    const newRun = investigation({
      workflow_execution_id: 'exec-2',
      started_at: '2026-01-01T03:00:00.000Z',
    });

    // exec-1 was running; attaching exec-2 stamps completed_at on exec-1 (reconciliation). The
    // superseded exec-1 never truly completed, so it emits nothing.
    emitSignificantEventInvestigationTriggers({
      eventClient,
      significantEvent: event,
      previousInvestigations: [running],
      nextInvestigations: [
        investigation({
          workflow_execution_id: 'exec-1',
          completed_at: '2026-01-01T03:00:00.000Z',
        }),
        newRun,
      ],
      targetedWorkflowExecutionId: 'exec-2',
    });

    expect(emitTrigger).toHaveBeenCalledTimes(1);
    expect(emitTrigger).toHaveBeenCalledWith(
      INVESTIGATION_STARTED_TRIGGER_ID,
      expect.objectContaining({ workflow_execution_id: 'exec-2' })
    );
  });

  it('emits nothing when investigations are unchanged', () => {
    const { eventClient, emitTrigger } = createEventClient();
    const event = createEvent();
    const existing = investigation({ completed_at: '2026-01-01T02:00:00.000Z' });

    emitSignificantEventInvestigationTriggers({
      eventClient,
      significantEvent: event,
      previousInvestigations: [existing],
      nextInvestigations: [existing],
      targetedWorkflowExecutionId: 'exec-1',
    });

    expect(emitTrigger).not.toHaveBeenCalled();
  });
});
