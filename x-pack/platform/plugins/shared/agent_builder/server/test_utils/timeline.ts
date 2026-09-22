/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound, TimelineEvent } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { ProcessedRoundInput } from '@kbn/agent-builder-server';
import { eventsToRounds } from '../services/conversation/client/events_to_rounds';
import { roundsToEvents } from '../services/conversation/client/rounds_to_events';
import type { ProcessedTimelineEvent } from '../services/execution/run_agent/utils/context_timeline';

/** A round fixture whose input is already processed for the agent. */
export type ProcessedConversationRound = Omit<ConversationRound, 'input'> & {
  input: ProcessedRoundInput;
};

const EPOCH = new Date(0).toISOString();

/** The owner rounds without an explicit author are attributed to once normalized to the timeline. */
export const TIMELINE_FIXTURE_AUTHOR = { id: 'user-1', username: 'user-1' };

const fixtureConversation = (rounds: ConversationRound[]): Conversation =>
  ({
    id: 'conversation-1',
    agent_id: 'agent-1',
    title: 'fixture',
    user: TIMELINE_FIXTURE_AUTHOR,
    created_at: EPOCH,
    updated_at: EPOCH,
    rounds,
  } as Conversation);

/** An events-native conversation storing `events` (its rounds projection is irrelevant here). */
export const eventsNativeConversation = (events: TimelineEvent[]): Conversation => ({
  ...fixtureConversation([]),
  schema_version: CONVERSATION_SCHEMA_VERSION,
  events,
});

/** The rounds a context timeline reconstructs to; for assertions that are easier on rounds. */
export const roundsOfTimeline = (
  timeline: Array<TimelineEvent | ProcessedTimelineEvent>
): ConversationRound[] => eventsToRounds(timeline as TimelineEvent[]);

type RoundFixture = Partial<ConversationRound> | Partial<ProcessedConversationRound>;

// Wrapped in a tuple so the conditional does not distribute over a union of fixtures.
type TimelineOf<R extends RoundFixture> = [R] extends [Partial<ProcessedConversationRound>]
  ? ProcessedTimelineEvent[]
  : TimelineEvent[];

/**
 * Builds the timeline a rounds fixture would be normalized to. Partial fixtures get the run
 * metadata the event builders require; inputs are copied verbatim, so processed rounds yield a
 * processed timeline. A fixture without an `input` types as processed; give it a stored
 * `input` when a `TimelineEvent[]` is needed.
 */
export const timelineFromRounds = <R extends RoundFixture>(rounds: R[]): TimelineOf<R> => {
  const seen = new Set<string>();
  const completed = rounds.map((round, index) => {
    let id = round.id ?? `round-${index + 1}`;
    // Rounds fixtures often reuse an id; distinct rounds need distinct ids to fold apart.
    if (seen.has(id)) {
      id = `${id}-${index + 1}`;
    }
    seen.add(id);
    return {
      ...({
        status: 'completed',
        steps: [],
        response: { message: '' },
        started_at: EPOCH,
        time_to_first_token: 0,
        time_to_last_token: 0,
        model_usage: { connector_id: 'connector', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
        ...round,
        input: round.input ?? { message: '' },
      } as ConversationRound),
      id,
    };
  });
  return roundsToEvents(fixtureConversation(completed)) as TimelineOf<R>;
};

const userActor = { type: EventActorType.user, id: 'u1', username: 'user1' };
const agentActor = { type: EventActorType.agent, id: 'agent-1' };
const usage = { connector_id: 'c1', llm_calls: 1, input_tokens: 5, output_tokens: 5 };

/**
 * A round `r1` paused on an ask_user_question (exec_0), answered with option `a` (choice 0), and
 * finished by a resume execution (exec_1) responding `done`: the stored, append-only HITL shape.
 */
export const pausedAndResumedRoundTimeline = (): TimelineEvent[] =>
  [
    {
      id: 'r1::user_message',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: userActor,
      data: { message: 'do it' },
    },
    {
      id: 'r1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: agentActor,
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      data: { trigger_type: TimelineTriggerType.userMessage },
    },
    {
      id: 'r1::step::0',
      type: TimelineEventType.executionStep,
      created_at: '2026-01-01T00:00:00.001Z',
      actor: agentActor,
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      data: {
        step: {
          type: 'ask_user_question',
          prompt_id: 'p1',
          questions: [
            { question: 'q', options: [{ label: 'a' }, { label: 'b' }], multi_select: false },
          ],
        },
        sequence: 0,
      },
    },
    {
      id: 'r1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      created_at: '2026-01-01T00:00:00.002Z',
      actor: agentActor,
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      data: {
        model_usage: usage,
        time_to_first_token: 1,
        time_to_last_token: 2,
        outcome: {
          type: 'prompt_requested',
          prompts: [{ id: 'p1', type: AgentPromptType.ask_user_question, questions: [] }],
        },
      },
    },
    {
      id: 'r1::prompt_response::1',
      type: TimelineEventType.promptResponse,
      created_at: '2026-01-01T00:01:00.000Z',
      actor: userActor,
      data: {
        prompt_requested_event_id: 'r1::execution_terminated',
        responses: {
          p1: { type: AgentPromptType.ask_user_question, answers: [{ choice: [0] }] },
        },
      },
    },
    {
      id: 'r1::execution::1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:01:00.000Z',
      actor: agentActor,
      execution_id: 'r1::execution::1',
      trigger_event_id: 'r1::prompt_response::1',
      data: { trigger_type: TimelineTriggerType.promptResponse },
    },
    {
      id: 'r1::execution::1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      created_at: '2026-01-01T00:01:00.010Z',
      actor: agentActor,
      execution_id: 'r1::execution::1',
      trigger_event_id: 'r1::prompt_response::1',
      data: {
        model_usage: usage,
        time_to_first_token: 1,
        time_to_last_token: 2,
        outcome: { type: 'responded', response: { message: 'done' } },
      },
    },
  ] as unknown as TimelineEvent[];
