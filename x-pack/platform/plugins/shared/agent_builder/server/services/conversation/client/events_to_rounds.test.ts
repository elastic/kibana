/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound, TimelineEvent } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { roundsToEvents } from './rounds_to_events';
import { eventsToRounds } from './events_to_rounds';

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

describe('eventsToRounds', () => {
  it('round-trips completed rounds, preserving content and order', () => {
    const rounds = [baseRound(), baseRound({ id: 'round-2', input: { message: 'again' } })];
    const conversation = baseConversation(rounds);

    expect(eventsToRounds(roundsToEvents(conversation))).toEqual(rounds);
  });

  it('round-trips an awaiting-prompt round, preserving its prompts and run metrics', () => {
    const prompts = [{ id: 'p1' }] as unknown as PromptRequest[];
    const round = baseRound({
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: prompts,
    });

    expect(eventsToRounds(roundsToEvents(baseConversation([round])))).toEqual([round]);
  });

  it('recovers an external author and origin from the user_message actor', () => {
    const round = baseRound({
      author: { id: 'slack-U123', username: 'bob' },
      origin: { type: ConversationOriginType.Slack },
    });

    const [reconstructed] = eventsToRounds(roundsToEvents(baseConversation([round])));

    expect(reconstructed.author).toEqual({ id: 'slack-U123', username: 'bob' });
    expect(reconstructed.origin).toEqual({ type: ConversationOriginType.Slack });
  });

  it('derives the round id from the execution id, falling back when it has no suffix', () => {
    const events: TimelineEvent[] = [
      {
        id: 'um',
        type: TimelineEventType.userMessage,
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { type: EventActorType.user, id: 'user-1' },
        data: { message: 'hi' },
      },
      {
        id: 'ec',
        type: TimelineEventType.executionCompleted,
        created_at: '2026-01-01T00:00:01.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: 'exec-abc',
        trigger_event_id: 'um',
        data: {
          response: { message: 'yo' },
          steps: [],
          model_usage: { connector_id: '', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
          time_to_first_token: 0,
          time_to_last_token: 0,
        },
      },
    ];

    expect(eventsToRounds(events)[0].id).toBe('exec-abc');
  });

  it('skips an execution with no completed or prompt_requested terminal (failed/aborted)', () => {
    const events: TimelineEvent[] = [
      {
        id: 'um',
        type: TimelineEventType.userMessage,
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { type: EventActorType.user, id: 'user-1' },
        data: { message: 'hi' },
      },
      {
        id: 'es',
        type: TimelineEventType.executionStarted,
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: 'exec-1',
        trigger_event_id: 'um',
        data: { trigger_type: TimelineTriggerType.userMessage },
      },
      {
        id: 'ef',
        type: TimelineEventType.executionFailed,
        created_at: '2026-01-01T00:00:01.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: 'exec-1',
        trigger_event_id: 'um',
        data: { error: { message: 'boom' } as never },
      },
    ];

    expect(eventsToRounds(events)).toEqual([]);
  });

  it('returns no rounds when there are no executions', () => {
    expect(eventsToRounds([])).toEqual([]);
  });
});
