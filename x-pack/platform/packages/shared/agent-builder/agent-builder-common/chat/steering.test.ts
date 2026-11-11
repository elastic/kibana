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
  pendingSteers,
  pendingSteersFor,
  settledMessageIds,
  unfinishedReadCount,
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

const deliveredStep = (executionId: string, eventId: string, sequence = 0): ConversationEvent => ({
  id: `${executionId}::step::${sequence}`,
  type: TimelineEventType.executionStep,
  execution_id: executionId,
  created_at: '2026-01-01T00:00:10.000Z',
  actor,
  data: {
    sequence,
    step: {
      type: ConversationRoundStepType.deliveredMessage,
      event_id: eventId,
      author: actor,
      is_run_owner: true,
      message: `m-${eventId}`,
      delivered_at: '2026-01-01T00:00:10.000Z',
      cycle: 1,
      redelivered: 0,
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
      ? { outcome: { type: outcomeType } }
      : { error: { code: 'x', message: 'x' } },
});

describe('steering predicates', () => {
  it('settles a steer named by a step of a finished execution', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 's1'),
      terminal('e1', TimelineEventType.executionTerminated),
    ];
    expect(settledMessageIds(events)).toEqual(new Set(['s1']));
    expect(pendingSteers(events)).toEqual([]);
  });

  it('settles a steer picked up before a pause on a prompt', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 's1'),
      terminal('e1', TimelineEventType.executionTerminated, 'prompt_requested'),
    ];
    expect(settledMessageIds(events)).toEqual(new Set(['s1']));
  });

  it('keeps a steer pending when the execution that read it failed, and counts the read', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 's1'),
      terminal('e1', TimelineEventType.executionFailed),
    ];
    expect(settledMessageIds(events).size).toBe(0);
    expect(pendingSteers(events).map((e) => e.id)).toEqual(['s1']);
    expect(unfinishedReadCount(events, 's1')).toBe(1);
  });

  it('settles a steer read by a failed execution once a later execution finishes with it', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 's1'),
      terminal('e1', TimelineEventType.executionAborted),
      deliveredStep('e2', 's1'),
      terminal('e2', TimelineEventType.executionTerminated),
    ];
    expect(settledMessageIds(events)).toEqual(new Set(['s1']));
    expect(unfinishedReadCount(events, 's1')).toBe(1);
  });

  it('orders pending steers by created_at and scopes the per-run count to the stamped id', () => {
    const events = [
      userMessage('s2', '2026-01-01T00:00:02.000Z', { execution_id: 'e2' }),
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
    ];
    expect(pendingSteers(events).map((e) => e.id)).toEqual(['s1', 's2']);
    expect(pendingSteersFor(events, 'e1').map((e) => e.id)).toEqual(['s1']);
  });

  it('ignores an unstamped (never-mode) message', () => {
    const events = [userMessage('plain', '2026-01-01T00:00:01.000Z')];
    expect(pendingSteers(events)).toEqual([]);
  });

  it('treats a step with no terminal yet (live execution) as not settled', () => {
    const events = [
      userMessage('s1', '2026-01-01T00:00:01.000Z', { execution_id: 'e1' }),
      deliveredStep('e1', 's1'),
    ];
    expect(settledMessageIds(events).size).toBe(0);
    expect(pendingSteers(events).map((e) => e.id)).toEqual(['s1']);
  });
});
