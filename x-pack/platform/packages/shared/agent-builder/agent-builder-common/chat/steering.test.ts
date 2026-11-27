/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from './conversation';
import { EventActorType, TimelineEventType } from './timeline_events';
import type { ConversationEvent } from './timeline_events';
import {
  analyzeSteers,
  pendingSteers,
  pendingSteersFor,
  steersToDeliver,
  unreadSettledSteerIds,
} from './steering';

const actor = { type: EventActorType.user, id: 'u1' };

const userMessage = (
  id: string,
  createdAt: string,
  steer?: { execution_id: string }
): ConversationEvent => ({
  id,
  type: TimelineEventType.userMessage,
  created_at: createdAt,
  actor,
  data: { message: `m-${id}`, ...(steer ? { steer } : {}) },
});

const deliveredStep = (executionId: string, eventId: string): ConversationEvent => ({
  id: `${executionId}::step::0`,
  type: TimelineEventType.executionStep,
  execution_id: executionId,
  created_at: '2026-01-01T00:00:10.000Z',
  actor,
  data: {
    sequence: 0,
    step: {
      type: ConversationRoundStepType.deliveredMessage,
      event_id: eventId,
      author: actor,
      is_run_owner: true,
      message: `m-${eventId}`,
      delivered_at: '2026-01-01T00:00:10.000Z',
      cycle: 1,
    },
  },
});

const terminal = (
  executionId: string,
  type:
    | TimelineEventType.executionTerminated
    | TimelineEventType.executionFailed
    | TimelineEventType.executionAborted,
  outcomeType: 'responded' | 'prompt_requested' = 'responded'
): ConversationEvent => ({
  id: `${executionId}::terminal`,
  type,
  execution_id: executionId,
  created_at: '2026-01-01T00:00:20.000Z',
  actor,
  data:
    type === TimelineEventType.executionTerminated
      ? {
          outcome:
            outcomeType === 'prompt_requested'
              ? { type: 'prompt_requested', prompts: [] }
              : { type: 'responded', response: { message: 'done' } },
        }
      : { error: { code: 'x', message: 'x' } },
});

/** The stored answer carries no execution id; the resume's first event names it as its trigger. */
const resume = (pausedExecutionId: string, resumeExecutionId: string): ConversationEvent[] => [
  {
    id: `${pausedExecutionId}::answer`,
    type: TimelineEventType.promptResponse,
    created_at: '2026-01-01T00:00:30.000Z',
    actor,
    data: { prompt_requested_event_id: `${pausedExecutionId}::terminal`, responses: {} },
  } as unknown as ConversationEvent,
  {
    id: `${resumeExecutionId}::started`,
    type: TimelineEventType.executionStarted,
    execution_id: resumeExecutionId,
    trigger_event_id: `${pausedExecutionId}::answer`,
    created_at: '2026-01-01T00:00:31.000Z',
    actor,
    data: { trigger_type: 'prompt_response' },
  } as unknown as ConversationEvent,
];

describe('steering predicates', () => {
  it('settles the steers of a run that responded, read or not', () => {
    const events = [
      userMessage('read', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      userMessage('unread', '2026-01-01T00:00:02.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 'read'),
      terminal('e1', TimelineEventType.executionTerminated),
    ];
    const status = analyzeSteers(events);
    expect(status.read).toEqual(new Set(['read']));
    expect(status.over).toEqual(new Set(['e1']));
    expect(pendingSteers(events, status)).toEqual([]);
  });

  it.each([TimelineEventType.executionFailed, TimelineEventType.executionAborted] as const)(
    'settles the steers of a run that ended with %s, read or not',
    (type) => {
      const events = [
        userMessage('read', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
        userMessage('unread', '2026-01-01T00:00:02.000Z', { execution_id: 'e1' }),
        deliveredStep('e1', 'read'),
        terminal('e1', type),
      ];
      const status = analyzeSteers(events);
      expect(status.read).toEqual(new Set(['read']));
      expect(status.over).toEqual(new Set(['e1']));
      expect(pendingSteers(events, status)).toEqual([]);
      expect(steersToDeliver(events, 'e2', status)).toEqual([]);
    }
  );

  it('keeps the steers of a paused run pending for its resume', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      terminal('e1', TimelineEventType.executionTerminated, 'prompt_requested'),
    ];
    const status = analyzeSteers(events);
    expect(status.paused).toEqual(new Set(['e1']));
    expect(status.over.size).toBe(0);
    expect(steersToDeliver(events, 'e2', status).map((e) => e.id)).toEqual(['s1']);
  });

  it('settles a paused chain once its last resume is over', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      terminal('e1', TimelineEventType.executionTerminated, 'prompt_requested'),
      ...resume('e1', 'e2'),
      terminal('e2', TimelineEventType.executionTerminated, 'prompt_requested'),
      ...resume('e2', 'e3'),
      terminal('e3', TimelineEventType.executionFailed),
    ];
    const status = analyzeSteers(events);
    expect(status.over).toEqual(new Set(['e1', 'e2', 'e3']));
    expect(status.paused.size).toBe(0);
    expect(pendingSteers(events, status)).toEqual([]);
  });

  it('treats a run with no terminal yet as live: its steers stay pending, read or not', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      userMessage('s2', '2026-01-01T00:00:02.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 's1'),
    ];
    const status = analyzeSteers(events);
    expect(status.read).toEqual(new Set(['s1']));
    expect(pendingSteers(events, status).map((e) => e.id)).toEqual(['s1', 's2']);
  });

  it('orders pending steers by created_at and scopes the per-run count to the stamped id', () => {
    const events = [
      userMessage('s2', '2026-01-01T00:00:02.000Z', { execution_id: 'e2' }),
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
    ];
    expect(pendingSteers(events).map((e) => e.id)).toEqual(['s1', 's2']);
    expect(pendingSteersFor(events, 'e1').map((e) => e.id)).toEqual(['s1']);
  });

  it('keeps a paused chain open while its last resume runs', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      terminal('e1', TimelineEventType.executionTerminated, 'prompt_requested'),
      ...resume('e1', 'e2'),
    ];
    const status = analyzeSteers(events);
    expect(status.paused).toEqual(new Set(['e1']));
    expect(steersToDeliver(events, 'e2', status).map((e) => e.id)).toEqual(['s1']);
  });

  it('does not deliver again a steer the paused run read before pausing', () => {
    const events = [
      userMessage('read', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      userMessage('unread', '2026-01-01T00:00:02.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 'read'),
      terminal('e1', TimelineEventType.executionTerminated, 'prompt_requested'),
    ];
    expect(steersToDeliver(events, 'e2').map((e) => e.id)).toEqual(['unread']);
  });

  it('delivers to a run only its own steers and those of the pause it resumes', () => {
    const events = [
      userMessage('stale', '2026-01-01T00:00:00.000Z', { execution_id: 'e0' }),
      userMessage('paused', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      terminal('e1', TimelineEventType.executionTerminated, 'prompt_requested'),
      userMessage('own', '2026-01-01T00:00:02.000Z', { execution_id: 'e2' }),
    ];
    expect(steersToDeliver(events, 'e2').map((e) => e.id)).toEqual(['paused', 'own']);
  });

  it('lists the steers an ended run never read, and no others', () => {
    const events = [
      userMessage('read', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      userMessage('unread', '2026-01-01T00:00:02.000Z', { execution_id: 'e1' }),
      userMessage('pending', '2026-01-01T00:00:03.000Z', { execution_id: 'e2' }),
      deliveredStep('e1', 'read'),
      terminal('e1', TimelineEventType.executionAborted),
    ];
    expect(unreadSettledSteerIds(events)).toEqual(new Set(['unread']));
  });

  it('ignores an unstamped (never-mode) message', () => {
    const events = [userMessage('plain', '2026-01-01T00:00:01.000Z')];
    expect(pendingSteers(events)).toEqual([]);
  });
});
