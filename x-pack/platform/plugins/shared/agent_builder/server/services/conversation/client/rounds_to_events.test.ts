/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  ConversationRoundStep,
} from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import {
  executionStartedEvent,
  isRoundDerivedEventId,
  roundsToEvents,
  userMessageEvent,
} from './rounds_to_events';

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

  it('emits one execution_step per round.steps entry, indexed by sequence, between start and terminated', () => {
    const steps: ConversationRoundStep[] = [
      {
        type: ConversationRoundStepType.reasoning,
        reasoning: 'thinking',
      } as ConversationRoundStep,
      {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'tc-1',
        tool_id: 'platform.core.search',
        params: { q: 'foo' },
        results: [],
      } as ConversationRoundStep,
    ];

    const events = roundsToEvents(baseConversation([baseRound({ steps })]));

    // Boundary events sandwich two step events in `sequence` order.
    expect(events.map((event) => event.type)).toEqual([
      TimelineEventType.userMessage,
      TimelineEventType.executionStarted,
      TimelineEventType.executionStep,
      TimelineEventType.executionStep,
      TimelineEventType.executionTerminated,
    ]);
    expect(events.map((event) => event.id)).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::step::0',
      'round-1::step::1',
      'round-1::execution_terminated',
    ]);

    // Step events carry the exact step payload from round.steps + a matching sequence.
    expect(events[2]).toMatchObject({
      type: TimelineEventType.executionStep,
      created_at: '2026-01-01T00:00:00.000Z',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      data: { step: steps[0], sequence: 0 },
    });
    expect(events[3]).toMatchObject({
      type: TimelineEventType.executionStep,
      data: { step: steps[1], sequence: 1 },
    });

    expect(events[4]).toMatchObject({ type: TimelineEventType.executionTerminated });
    const terminatedData = events[4].data as { steps?: unknown };
    expect(terminatedData.steps).toBeUndefined();
  });
});

describe('userMessageEvent (split builder)', () => {
  it('produces exactly one user_message event with the round input and actor', () => {
    const round = baseRound();
    const conversation = baseConversation([round]);
    const event = userMessageEvent(round, conversation);

    expect(event).toMatchObject({
      id: 'round-1::user_message',
      type: TimelineEventType.userMessage,
      created_at: round.started_at,
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      data: { message: 'hello' },
    });
    // No `execution_id` / `trigger_event_id` fields belong on the user_message.
    expect(event).not.toHaveProperty('execution_id');
    expect(event).not.toHaveProperty('trigger_event_id');
  });
});

describe('executionStartedEvent (split builder)', () => {
  it('produces exactly one execution_started event that references the round input event', () => {
    const round = baseRound();
    const conversation = baseConversation([round]);
    const event = executionStartedEvent(round, conversation);

    expect(event).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: round.started_at,
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
    });
  });
});

describe('isRoundDerivedEventId', () => {
  it.each(
    roundsToEvents(
      baseConversation([
        baseRound({
          steps: [
            { type: ConversationRoundStepType.reasoning, reasoning: 'r' } as ConversationRoundStep,
          ],
        }),
      ])
    ).map((event) => event.id as string)
  )('recognizes round-derived id %p', (id) => {
    expect(isRoundDerivedEventId(id)).toBe(true);
  });

  it('recognizes step ids at arbitrary sequences (the `::step::N` marker is a prefix, not a suffix)', () => {
    expect(isRoundDerivedEventId('round-1::step::0')).toBe(true);
    expect(isRoundDerivedEventId('round-42::step::12')).toBe(true);
  });

  it('rejects ids that are not round-derived', () => {
    expect(isRoundDerivedEventId('some-additive-error')).toBe(false);
    expect(isRoundDerivedEventId('::user_message::follow-up')).toBe(false);
    expect(isRoundDerivedEventId('')).toBe(false);
  });

  it('rejects additive ids that merely contain the step marker (check is anchored to ::step::N$)', () => {
    expect(isRoundDerivedEventId('my-error::step::context')).toBe(false);
    expect(isRoundDerivedEventId('round-1::step::0::retry')).toBe(false);
    expect(isRoundDerivedEventId('round-1::step::')).toBe(false);
  });
});
