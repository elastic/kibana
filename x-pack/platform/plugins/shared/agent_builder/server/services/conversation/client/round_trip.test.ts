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
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { roundsToEvents } from './rounds_to_events';
import { eventsToRounds } from './events_to_rounds';

const conversationWith = (rounds: ConversationRound[]): Conversation => ({
  id: 'conv-1',
  agent_id: 'agent-1',
  user: { id: 'user-1', username: 'alice' },
  title: 'T',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  rounds,
});

const baseRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  // Every real round is stamped with a Kibana-user author (here, the conversation owner).
  author: { id: 'user-1', username: 'alice' },
  steps: [],
  response: { message: 'hi there' },
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 10,
  time_to_last_token: 20,
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 5, output_tokens: 7 },
  ...overrides,
});

// The invariant that makes the eventual events-native flip safe: converting a round to events and
// back must be an identity. This suite is the permanent net; it must hold for every real shape.
const roundTrip = (rounds: ConversationRound[]): ConversationRound[] =>
  eventsToRounds(roundsToEvents(conversationWith(rounds)));

describe('round-trip fidelity: eventsToRounds(roundsToEvents(round)) === round', () => {
  it('preserves a maximal completed round (steps, structured output, attachments, trace_id, state, overrides)', () => {
    const steps: ConversationRoundStep[] = [
      {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'tc-1',
        tool_id: 'platform.core.execute_esql',
        params: { query: 'FROM foo' },
        progression: [],
        tool_call_group_id: 'grp-1',
        results: [{ tool_result_id: 'r1', type: 'other', data: { ok: true } }],
      } as ConversationRoundStep,
      {
        type: ConversationRoundStepType.reasoning,
        reasoning: 'thinking about it',
      } as ConversationRoundStep,
    ];

    const round = baseRound({
      input: {
        message: 'hello',
        attachment_refs: [
          { attachment_id: 'a1', version: 1, actor: 'user', operation: 'created' },
        ] as unknown as ConversationRound['input']['attachment_refs'],
        attachment_context: 'pre-rendered context',
      },
      steps,
      response: { message: 'hi there', structured_output: { foo: 'bar' } },
      trace_id: ['trace-a', 'trace-b'],
      configuration_overrides: {
        some: 'override',
      } as unknown as ConversationRound['configuration_overrides'],
      state: { agent: { nodes: [] } } as unknown as ConversationRound['state'],
    });

    expect(roundTrip([round])).toEqual([round]);
  });

  it('preserves a single-string trace_id', () => {
    const round = baseRound({ trace_id: 'trace-single' });
    expect(roundTrip([round])).toEqual([round]);
  });

  it('preserves multiple rounds in order, with per-round ids', () => {
    const rounds = [
      baseRound({ id: 'round-1', input: { message: 'first' } }),
      baseRound({ id: 'round-2', input: { message: 'second' } }),
      baseRound({ id: 'round-3', input: { message: 'third' } }),
    ];
    expect(roundTrip(rounds)).toEqual(rounds);
  });

  it('preserves an awaiting-prompt round with its prompts, resume state, and run metrics', () => {
    const round = baseRound({
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [{ id: 'p1' }] as unknown as PromptRequest[],
      state: { agent: { nodes: [] } } as unknown as ConversationRound['state'],
      // A paused run has no final response yet.
      response: { message: '' },
    });
    expect(roundTrip([round])).toEqual([round]);
  });

  it('preserves a Kibana-user author distinct from the conversation owner (shared conversation)', () => {
    const round = baseRound({ author: { id: 'kibana-user-2', username: 'bob' } });
    expect(roundTrip([round])).toEqual([round]);
  });

  it('keeps origin on an authorless external round (attributes it to the conversation owner)', () => {
    const { author, ...noAuthor } = baseRound();
    const round: ConversationRound = {
      ...noAuthor,
      origin: { type: ConversationOriginType.Slack },
    };

    const [reconstructed] = roundTrip([round]);

    // The regression this guards: origin must survive even when the round has no author.
    expect(reconstructed.origin).toEqual({ type: ConversationOriginType.Slack });
    // No source author, so the round is attributed to the conversation owner (documented behavior).
    expect(reconstructed.author).toEqual({ id: 'user-1', username: 'alice' });
  });

  describe('accepted, documented losses', () => {
    it('drops an in-progress round (the run has no terminal event yet)', () => {
      expect(roundTrip([baseRound({ status: ConversationRoundStatus.inProgress })])).toEqual([]);
    });
  });
});

// Cases that can only be expressed as raw event input (no round produces them via roundsToEvents):
// malformed ids and non-terminal / empty timelines.
describe('eventsToRounds (events-input-only)', () => {
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
        type: TimelineEventType.executionTerminated,
        created_at: '2026-01-01T00:00:01.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: 'exec-abc',
        trigger_event_id: 'um',
        data: {
          steps: [],
          model_usage: { connector_id: '', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
          time_to_first_token: 0,
          time_to_last_token: 0,
          outcome: { type: 'responded', response: { message: 'yo' } },
        },
      },
    ];

    expect(eventsToRounds(events)[0].id).toBe('exec-abc');
  });

  it('skips an execution with no execution_terminated event (failed/aborted/still running)', () => {
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
