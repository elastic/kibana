/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, toArray } from 'rxjs';
import {
  ChatEventType,
  TimelineEventType,
  type ChatEvent,
  type ConversationUpdatedEvent,
  type ExecutionStartedEvent,
  type ExecutionTerminatedEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { filterEventsNativeApiEvents, filterLegacyApiEvents } from './converse_helpers';

const roundCompleteEvent: RoundCompleteEvent = {
  type: ChatEventType.roundComplete,
  data: { round: { id: 'round-1' } as any },
};

const executionStartedEvent: ExecutionStartedEvent = {
  id: 'round-1::execution_started',
  type: TimelineEventType.executionStarted,
  created_at: '2024-01-01T00:00:00.000Z',
  actor: { type: 'agent', id: 'agent-1' } as any,
  execution_id: 'round-1::execution',
  trigger_event_id: 'round-1::user_message',
  data: { trigger_type: 'user_message' } as any,
};

const executionTerminatedEvent: ExecutionTerminatedEvent = {
  id: 'round-1::execution_terminated',
  type: TimelineEventType.executionTerminated,
  created_at: '2024-01-01T00:00:00.000Z',
  actor: { type: 'agent', id: 'agent-1' } as any,
  execution_id: 'round-1::execution',
  trigger_event_id: 'round-1::user_message',
  data: {
    outcome: { type: 'responded', response: { message: 'ok' } },
  } as any,
};

const conversationUpdatedEvent: ConversationUpdatedEvent = {
  type: ChatEventType.conversationUpdated,
  data: {
    conversation_id: 'conv-1',
    title: 't',
    access_control: { access_mode: 'private', entries: [] } as any,
  },
};

describe('converse_helpers filter operators', () => {
  const events: ChatEvent[] = [
    roundCompleteEvent,
    executionStartedEvent,
    executionTerminatedEvent,
    conversationUpdatedEvent,
  ];
  const source$ = of(...events);

  it('filterLegacyApiEvents drops execution_started + execution_terminated, keeps round_complete + conversation_updated', async () => {
    const emitted = await firstValueFrom(source$.pipe(filterLegacyApiEvents(), toArray()));

    expect(emitted.map((event) => event.type)).toEqual([
      ChatEventType.roundComplete,
      ChatEventType.conversationUpdated,
    ]);
  });

  it('filterEventsNativeApiEvents drops round_complete, keeps execution_started + execution_terminated + conversation_updated', async () => {
    const emitted = await firstValueFrom(source$.pipe(filterEventsNativeApiEvents(), toArray()));

    expect(emitted.map((event) => event.type)).toEqual([
      TimelineEventType.executionStarted,
      TimelineEventType.executionTerminated,
      ChatEventType.conversationUpdated,
    ]);
  });
});
