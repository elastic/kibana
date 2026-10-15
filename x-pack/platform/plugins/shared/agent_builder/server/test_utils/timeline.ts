/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationEvent,
  ConversationRound,
  ConversationRoundStep,
  ExecutionOutcome,
  RoundModelUsageStats,
  SerializedExecutionError,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  AgentBuilderErrorCode,
  CONVERSATION_SCHEMA_VERSION,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import type { ProcessedRoundInput } from '@kbn/agent-builder-server';
import { eventsToRounds } from '../services/conversation/client/events_to_rounds';
import { roundsToEvents } from '../services/conversation/client/rounds_to_events';
import type {
  ProcessedCustomEvent,
  ProcessedTimelineEvent,
} from '../services/execution/run_agent/utils/context_timeline';

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

export const T0 = '2026-01-01T00:00:00.000Z';
export const T1 = '2026-01-01T00:01:00.000Z';
export const BOOM: SerializedExecutionError = {
  code: AgentBuilderErrorCode.internalError,
  message: 'boom',
};

export const userMessageEvent = (roundId: string, createdAt = T0): TimelineEvent =>
  ({
    id: `${roundId}::user_message`,
    type: TimelineEventType.userMessage,
    created_at: createdAt,
    actor: userActor,
    data: { message: `hello ${roundId}` },
  } as TimelineEvent);

export const promptResponseEvent = (
  roundId: string,
  index: number,
  answers: string,
  createdAt = T1
): TimelineEvent =>
  ({
    id: `${roundId}::prompt_response::${index}`,
    type: TimelineEventType.promptResponse,
    created_at: createdAt,
    actor: userActor,
    data: { prompt_requested_event_id: answers, responses: {} },
  } as TimelineEvent);

/** The `RoundState` a pause stores: one `execute_tool` node per tool call the run paused on. */
export const pauseState = (toolCallIds: string[]): RoundState => ({
  version: 1,
  agent: {
    current_cycle: 1,
    error_count: 0,
    nodes: toolCallIds.map((id) => ({
      step: 'execute_tool',
      tool_call_id: id,
      tool_id: 'my_tool',
      tool_params: {},
      tool_state: undefined,
    })),
  },
});

interface ExecutionFixture {
  roundId: string;
  /** 0 for exec_0, k for the k-th resume. */
  index?: number;
  steps?: ConversationRoundStep[];
  createdAt?: string;
}

const executionIds = (roundId: string, index: number) => {
  const executionId = index === 0 ? `${roundId}::execution` : `${roundId}::execution::${index}`;
  const idPrefix = index === 0 ? roundId : executionId;
  const triggerEventId =
    index === 0 ? `${roundId}::user_message` : `${roundId}::prompt_response::${index}`;
  const triggerType =
    index === 0 ? TimelineTriggerType.userMessage : TimelineTriggerType.promptResponse;
  return { executionId, idPrefix, triggerEventId, triggerType };
};

const startAndSteps = (fixture: ExecutionFixture): TimelineEvent[] => {
  const { roundId, index = 0, steps = [], createdAt = T0 } = fixture;
  const { executionId, idPrefix, triggerEventId, triggerType } = executionIds(roundId, index);
  return [
    {
      id: `${idPrefix}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
      data: { trigger_type: triggerType },
    },
    ...steps.map((step, sequence) => ({
      id: `${idPrefix}::step::${sequence}`,
      type: TimelineEventType.executionStep as const,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
      data: { step, sequence },
    })),
  ] as TimelineEvent[];
};

/** started + steps + `execution_terminated` with the given outcome (and optional resume state). */
export const terminatedExecutionEvents = (
  fixture: ExecutionFixture & {
    outcome: ExecutionOutcome;
    state?: RoundState;
    modelUsage?: RoundModelUsageStats;
    timeToFirstToken?: number;
  }
): TimelineEvent[] => {
  const {
    roundId,
    index = 0,
    createdAt = T0,
    outcome,
    state,
    modelUsage = usage,
    timeToFirstToken = 10,
  } = fixture;
  const { executionId, idPrefix, triggerEventId } = executionIds(roundId, index);
  return [
    ...startAndSteps(fixture),
    {
      id: `${idPrefix}::execution_terminated`,
      type: TimelineEventType.executionTerminated,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
      data: {
        model_usage: modelUsage,
        time_to_first_token: timeToFirstToken,
        time_to_last_token: 100,
        outcome,
        ...(state ? { state } : {}),
      },
    },
  ] as TimelineEvent[];
};

export type InterruptionFixture =
  | { type: 'failed'; error?: { code: string; message: string } }
  | { type: 'aborted'; aborted_by?: { source: 'api' | 'task_manager' | 'caller' } };

/** started + steps + `execution_failed` / `execution_aborted`. */
export const interruptedExecutionEvents = (
  fixture: ExecutionFixture & {
    interruption: InterruptionFixture;
    modelUsage?: RoundModelUsageStats;
    timeToFirstToken?: number;
  }
): TimelineEvent[] => {
  const {
    roundId,
    index = 0,
    createdAt = T0,
    interruption,
    modelUsage,
    timeToFirstToken,
  } = fixture;
  const { executionId, idPrefix, triggerEventId } = executionIds(roundId, index);
  const summary = {
    time_to_last_token: 100,
    ...(modelUsage ? { model_usage: modelUsage } : {}),
    ...(timeToFirstToken !== undefined ? { time_to_first_token: timeToFirstToken } : {}),
  };
  const terminal =
    interruption.type === 'failed'
      ? {
          id: `${idPrefix}::execution_failed`,
          type: TimelineEventType.executionFailed,
          data: { ...summary, error: interruption.error ?? BOOM },
        }
      : {
          id: `${idPrefix}::execution_aborted`,
          type: TimelineEventType.executionAborted,
          data: {
            ...summary,
            ...(interruption.aborted_by ? { aborted_by: interruption.aborted_by } : {}),
          },
        };
  return [
    ...startAndSteps(fixture),
    {
      ...terminal,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
    },
  ] as TimelineEvent[];
};

// Whole-round fixtures (raw events, one round each). Ids default to `r1`.

export const completedRoundTimeline = (roundId = 'r1', createdAt = T0): TimelineEvent[] => [
  userMessageEvent(roundId, createdAt),
  ...terminatedExecutionEvents({
    roundId,
    createdAt,
    outcome: { type: 'responded', response: { message: `answer ${roundId}` } },
  }),
];

export const pausedRoundTimeline = (
  roundId = 'r1',
  toolCallIds: string[] = [],
  createdAt = T0
): TimelineEvent[] => [
  userMessageEvent(roundId, createdAt),
  ...terminatedExecutionEvents({
    roundId,
    createdAt,
    steps: toolCallIds.map(
      (id) =>
        ({
          type: 'tool_call',
          tool_call_id: id,
          tool_id: 'my_tool',
          params: {},
          results: [],
        } as ConversationRoundStep)
    ),
    outcome: {
      type: 'prompt_requested',
      prompts: toolCallIds.map(
        (id) =>
          ({
            id: `tools.my_tool.confirmation.${id}`,
            type: AgentPromptType.confirmation,
            tool_call_id: id,
          } as never)
      ),
    },
    ...(toolCallIds.length > 0 ? { state: pauseState(toolCallIds) } : {}),
  }),
];

export const pausedThenInterruptedResumeTimeline = (
  roundId = 'r1',
  toolCallIds: string[] = [],
  resumeSteps: ConversationRoundStep[] = []
): TimelineEvent[] => [
  ...pausedRoundTimeline(roundId, toolCallIds),
  promptResponseEvent(roundId, 1, `${roundId}::execution_terminated`),
  ...interruptedExecutionEvents({
    roundId,
    index: 1,
    createdAt: T1,
    steps: resumeSteps,
    interruption: { type: 'failed' },
  }),
];

export const failedExec0Timeline = (
  roundId = 'r1',
  steps: ConversationRoundStep[] = [],
  createdAt = T0
): TimelineEvent[] => [
  userMessageEvent(roundId, createdAt),
  ...interruptedExecutionEvents({ roundId, createdAt, steps, interruption: { type: 'failed' } }),
];

export const abortedExec0Timeline = (
  roundId = 'r1',
  createdAt = T0,
  source?: 'api' | 'task_manager' | 'caller'
): TimelineEvent[] => [
  userMessageEvent(roundId, createdAt),
  ...interruptedExecutionEvents({
    roundId,
    createdAt,
    interruption: { type: 'aborted', ...(source ? { aborted_by: { source } } : {}) },
  }),
];

export const danglingResponseTimeline = (roundId = 'r1'): TimelineEvent[] => [
  ...pausedRoundTimeline(roundId),
  promptResponseEvent(roundId, 1, `${roundId}::execution_terminated`),
];

/** A stored custom (registered) conversation event: owned by no execution, ordered by timestamp. */
export const customEventFixture = ({
  id,
  type = 'text_note',
  created_at,
  data = { text: `${id} note` },
}: {
  id: string;
  type?: string;
  created_at: string;
  data?: Record<string, unknown>;
}): ConversationEvent => ({ id, type, created_at, actor: userActor, data });

/** A custom event with its LLM representation resolved, as `prepareConversation` emits it. */
export const processedCustomEventFixture = ({
  representation,
  ...event
}: Parameters<typeof customEventFixture>[0] & {
  representation?: string;
}): ProcessedCustomEvent => {
  const data = event.data ?? { text: `${event.id} note` };
  return {
    ...customEventFixture({ ...event, data }),
    representation: { type: 'text', value: representation ?? String(data.text ?? '') },
  };
};

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
