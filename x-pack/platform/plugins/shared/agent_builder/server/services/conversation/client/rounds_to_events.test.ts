/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import { roundsToEvents } from './rounds_to_events';

const baseRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [],
  response: { message: 'hi there' },
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 10,
  time_to_last_token: 20,
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 5, output_tokens: 7 },
  ...overrides,
});

const baseConversation = (rounds: ConversationRound[]): Conversation => ({
  id: 'conv-1',
  agent_id: 'agent-1',
  user: { id: 'user-1', username: 'alice' },
  title: 'T',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  rounds,
});

describe('roundsToEvents', () => {
  it('maps a completed round to user_message + execution_started + execution_terminated(responded)', () => {
    const events = roundsToEvents(baseConversation([baseRound()]));

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      id: 'round-1::user_message',
      type: TimelineEventType.userMessage,
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      data: { message: 'hello' },
    });
    expect(events[1]).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:00:00.000Z',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      actor: { type: EventActorType.agent, id: 'agent-1' },
    });
    expect(events[2]).toMatchObject({
      id: 'round-1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      // started_at (00.000Z) + time_to_last_token (20ms), not the same instant as the start.
      created_at: '2026-01-01T00:00:00.020Z',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      data: {
        model_usage: { input_tokens: 5, output_tokens: 7 },
        time_to_first_token: 10,
        time_to_last_token: 20,
        outcome: { type: 'responded', response: { message: 'hi there' } },
      },
    });
  });

  it('emits only user_message + execution_started for an in-progress round (no terminal)', () => {
    const events = roundsToEvents(
      baseConversation([baseRound({ status: ConversationRoundStatus.inProgress })])
    );

    expect(events.map((e) => e.type)).toEqual([
      TimelineEventType.userMessage,
      TimelineEventType.executionStarted,
    ]);
  });

  it('maps an awaiting-prompt round to user_message + execution_started + execution_terminated(prompt_requested)', () => {
    const prompts = [{ id: 'p1' }] as unknown as PromptRequest[];
    const events = roundsToEvents(
      baseConversation([
        baseRound({ status: ConversationRoundStatus.awaitingPrompt, pending_prompts: prompts }),
      ])
    );

    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
    });
    expect(events[2]).toMatchObject({
      id: 'round-1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      trigger_event_id: 'round-1::user_message',
      // The paused terminal carries the run summary; the prompts live on the outcome.
      data: {
        model_usage: { input_tokens: 5, output_tokens: 7 },
        time_to_first_token: 10,
        time_to_last_token: 20,
        outcome: { type: 'prompt_requested', prompts },
      },
    });
  });

  it('uses the round author (external origin) as the user_message actor', () => {
    const events = roundsToEvents(
      baseConversation([
        baseRound({
          author: { id: 'slack-U123', username: 'bob' },
          origin: { type: ConversationOriginType.Slack },
        }),
      ])
    );

    expect(events[0].actor).toEqual({
      type: EventActorType.external,
      id: 'slack-U123',
      username: 'bob',
      origin: { type: ConversationOriginType.Slack },
    });
  });

  it('marks an authorless round that has an origin as an external actor carrying the origin', () => {
    const events = roundsToEvents(
      baseConversation([baseRound({ origin: { type: ConversationOriginType.Slack } })])
    );

    expect(events[0].actor).toEqual({
      type: EventActorType.external,
      id: 'user-1',
      username: 'alice',
      origin: { type: ConversationOriginType.Slack },
    });
  });

  it('produces deterministic ids across calls, in round order', () => {
    const conversation = baseConversation([baseRound(), baseRound({ id: 'round-2' })]);

    const first = roundsToEvents(conversation).map((e) => e.id);
    const second = roundsToEvents(conversation).map((e) => e.id);

    expect(first).toEqual(second);
    expect(first).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::execution_terminated',
      'round-2::user_message',
      'round-2::execution_started',
      'round-2::execution_terminated',
    ]);
  });
});
