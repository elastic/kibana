/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A simplified, self-contained codec between RAMEN's flat `conversation_rounds` and Agent
 * Builder's events-native timeline (`events`, `schema_version >= 1`).
 *
 * It mirrors the Agent Builder converters (`events_to_rounds.ts`, `rounds_to_events.ts`,
 * `round_writes.ts`), which are internal to that plugin, using the shared id helpers from
 * `@kbn/agent-builder-common` so both sides produce and recognise the same event ids.
 *
 * Deliberate simplifications (lower fidelity, but never destructive):
 * - HITL resumes are merged into one round (pending tool calls filled from the resume), but
 *   `ask_user_question` answers are not copied onto the question step.
 * - A round whose stored timeline spans several executions (a HITL resume) is not rewritten from
 *   RAMEN's flat copy: the stored events are kept as they are.
 * - Executions that have not terminated yet (in progress) are not surfaced as rounds, exactly
 *   like Agent Builder.
 */

import type {
  ConversationEvent,
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundOrigin,
  ConversationRoundStep,
  EventActor,
  ExecutionInterruption,
  ExecutionOutcome,
  ExecutionStepEvent,
  ExecutionTerminalEvent,
  PromptResponseEvent,
  RoundInput,
  RoundModelUsageStats,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import {
  CONVERSATION_EVENT_ID_DELIMITER,
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  EventActorType,
  ROUND_DERIVED_EVENT_ID_SUFFIXES,
  TimelineEventType,
  TimelineTriggerType,
  ZERO_MODEL_USAGE,
  answeredPromptRequestIds,
  interruptionOfTerminal,
  isEventsNativeVersion,
  isToolCallStep,
  lastExecutionTerminal,
  parseExecutionId,
  roundStepEventId,
  roundUserMessageEventId,
} from '@kbn/agent-builder-common';

export type { ConversationEvent };

export interface ActorContext {
  agentId: string;
  username: string;
  userId?: string;
}

// ---------------------------------------------------------------------------------------------
// Tool-call result (de)serialization for the `conversation_rounds` field
// ---------------------------------------------------------------------------------------------

/**
 * Tool call `results` are stored as JSON strings so the `conversation_rounds` field matches the
 * shape Agent Builder persists (see `PersistentConversationRoundStep`). The RAMEN client sends
 * `results` as objects/arrays, so this must run before indexing.
 */
export const serializeConversationRounds = (rounds: ConversationRound[]): ConversationRound[] =>
  rounds.map((round) => ({
    ...round,
    steps: (round.steps ?? []).map((step) => {
      if (isToolCallStep(step) && step.results !== undefined && typeof step.results !== 'string') {
        return { ...step, results: JSON.stringify(step.results) };
      }
      return step;
    }),
  })) as ConversationRound[];

/**
 * Inverse of {@link serializeConversationRounds}. Events are never serialized, so without this a
 * response built from stored rounds would carry stringified results while one folded from events
 * would carry objects.
 */
export const deserializeConversationRounds = (rounds: ConversationRound[]): ConversationRound[] =>
  rounds.map((round) => ({
    ...round,
    steps: (round.steps ?? []).map((step) => {
      if (isToolCallStep(step) && typeof step.results === 'string') {
        try {
          return { ...step, results: JSON.parse(step.results) };
        } catch {
          return step;
        }
      }
      return step;
    }),
  }));

// ---------------------------------------------------------------------------------------------
// events -> rounds (fold)
// ---------------------------------------------------------------------------------------------

interface ExecutionPartial {
  /** 0 for the initial execution, k for the k-th resume. */
  index: number;
  round: ConversationRound;
}

type RunFields = Pick<
  ConversationRound,
  | 'status'
  | 'response'
  | 'pending_prompts'
  | 'state'
  | 'steps'
  | 'model_usage'
  | 'time_to_first_token'
  | 'time_to_last_token'
  | 'trace_id'
  | 'configuration_overrides'
  | 'interruption'
>;

const stepsOf = (group: ConversationEvent[]): ConversationRoundStep[] => {
  const byId = new Map<string, ExecutionStepEvent>();
  for (const event of group) {
    if (event.type === TimelineEventType.executionStep) {
      byId.set(event.id, event as ExecutionStepEvent);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => (a.data.sequence ?? 0) - (b.data.sequence ?? 0))
    .map((event) => event.data.step)
    .filter((step): step is ConversationRoundStep => Boolean(step));
};

const runFields = (
  terminal: ExecutionTerminalEvent,
  stepEvents: ConversationRoundStep[],
  answered: ReadonlySet<string>
): RunFields => {
  if (terminal.type === TimelineEventType.executionTerminated) {
    const { data } = terminal;
    const summary = {
      steps: stepEvents.length > 0 ? stepEvents : data.steps ?? [],
      model_usage: data.model_usage ?? ZERO_MODEL_USAGE,
      time_to_first_token: data.time_to_first_token ?? 0,
      time_to_last_token: data.time_to_last_token ?? 0,
      ...(data.trace_id ? { trace_id: data.trace_id } : {}),
      ...(data.configuration_overrides
        ? { configuration_overrides: data.configuration_overrides }
        : {}),
    };
    if (data.outcome?.type === 'responded') {
      return {
        ...summary,
        status: ConversationRoundStatus.completed,
        response: data.outcome.response ?? { message: '' },
      };
    }
    if (data.outcome?.type === 'prompt_requested' && !answered.has(terminal.id)) {
      return {
        ...summary,
        ...(data.state ? { state: data.state } : {}),
        status: ConversationRoundStatus.awaitingPrompt,
        pending_prompts: data.outcome.prompts ?? [],
        response: { message: '' },
      };
    }
    // An answered pause (or an unknown outcome): nothing is pending anymore.
    return { ...summary, status: ConversationRoundStatus.completed, response: { message: '' } };
  }

  // execution_failed / execution_aborted
  const { data } = terminal;
  return {
    steps: stepEvents,
    model_usage: data.model_usage ?? ZERO_MODEL_USAGE,
    time_to_first_token: data.time_to_first_token ?? 0,
    time_to_last_token: data.time_to_last_token ?? 0,
    ...(data.trace_id ? { trace_id: data.trace_id } : {}),
    ...(data.configuration_overrides
      ? { configuration_overrides: data.configuration_overrides }
      : {}),
    status: ConversationRoundStatus.completed,
    response: { message: '' },
    interruption: interruptionOfTerminal(terminal),
  };
};

const authorAndOrigin = (
  actor: EventActor | undefined
): Pick<ConversationRound, 'author' | 'origin'> => {
  if (!actor || (actor.type !== EventActorType.user && actor.type !== EventActorType.external)) {
    return {};
  }
  const author: ConversationRoundAuthor = {
    id: actor.id,
    ...(actor.username ? { username: actor.username } : {}),
    ...(actor.full_name ? { full_name: actor.full_name } : {}),
  };
  return { author, ...(actor.origin ? { origin: actor.origin } : {}) };
};

const toTraceIds = (traceId: string | string[] | undefined): string[] =>
  traceId === undefined ? [] : Array.isArray(traceId) ? traceId : [traceId];

const mergeModelUsage = (
  a: RoundModelUsageStats,
  b: RoundModelUsageStats
): RoundModelUsageStats => ({
  connector_id: a.connector_id || b.connector_id,
  llm_calls: a.llm_calls + b.llm_calls,
  input_tokens: a.input_tokens + b.input_tokens,
  output_tokens: a.output_tokens + b.output_tokens,
  ...(a.cached_input_tokens !== undefined || b.cached_input_tokens !== undefined
    ? { cached_input_tokens: (a.cached_input_tokens ?? 0) + (b.cached_input_tokens ?? 0) }
    : {}),
  ...(a.model ?? b.model ? { model: a.model ?? b.model } : {}),
});

/**
 * Folds a resume execution into the round it resumes. Tool calls that were pending in the paused
 * execution (empty results) are filled with the resume's resolved copy, which is then dropped
 * from the resume's own steps, so a resumed turn does not show the same call twice.
 */
const mergeResume = (previous: ConversationRound, next: ConversationRound): ConversationRound => {
  const pendingIds = new Set(
    previous.steps
      .filter(isToolCallStep)
      .filter((step) => Array.isArray(step.results) && step.results.length === 0)
      .map((step) => step.tool_call_id)
  );
  const resolved = new Map(
    next.steps
      .filter(isToolCallStep)
      .filter((step) => pendingIds.has(step.tool_call_id))
      .map((step) => [step.tool_call_id, step] as const)
  );
  const filled = previous.steps.map((step) => {
    const copy = isToolCallStep(step) ? resolved.get(step.tool_call_id) : undefined;
    return copy ? { ...step, results: copy.results } : step;
  });
  const remaining = next.steps.filter(
    (step) => !(isToolCallStep(step) && resolved.has(step.tool_call_id))
  );
  const traceIds = [...toTraceIds(previous.trace_id), ...toTraceIds(next.trace_id)];
  const input: RoundInput = {
    ...previous.input,
    ...next.input,
    message: next.input.message || previous.input.message,
  };

  const {
    state: _state,
    pending_prompts: _pendingPrompts,
    interruption: _interruption,
    ...base
  } = previous;
  return {
    ...base,
    input,
    status: next.status,
    response: next.response,
    steps: [...filled, ...remaining],
    time_to_first_token: previous.time_to_first_token + next.time_to_first_token,
    time_to_last_token: previous.time_to_last_token + next.time_to_last_token,
    model_usage: mergeModelUsage(previous.model_usage, next.model_usage),
    ...(traceIds.length > 0 ? { trace_id: traceIds } : {}),
    ...(next.state ? { state: next.state } : {}),
    ...(next.pending_prompts ? { pending_prompts: next.pending_prompts } : {}),
    ...(next.interruption ? { interruption: next.interruption } : {}),
  };
};

/**
 * Reconstructs rounds from a timeline: one round per round id, its executions merged in order.
 * Executions without a terminal event (still running) and resumes without their initial
 * execution form no round. Rounds are returned in round-start order.
 */
export const roundsFromEvents = (events: ConversationEvent[]): ConversationRound[] => {
  const byId = new Map(events.map((event) => [event.id, event]));
  const answered = answeredPromptRequestIds(events);

  const executions = new Map<string, ConversationEvent[]>();
  for (const event of events) {
    if (!event.execution_id) {
      continue;
    }
    const group = executions.get(event.execution_id);
    if (group) {
      group.push(event);
    } else {
      executions.set(event.execution_id, [event]);
    }
  }

  const buckets = new Map<string, ExecutionPartial[]>();
  for (const [executionId, group] of executions) {
    const execution = parseExecutionId(executionId) ?? { roundId: executionId, index: 0 };
    const triggerId = group.find((event) => event.trigger_event_id)?.trigger_event_id;
    const trigger = triggerId ? byId.get(triggerId) : undefined;
    const userMessage =
      trigger?.type === TimelineEventType.userMessage ? (trigger as UserMessageEvent) : undefined;
    const promptResponse =
      trigger?.type === TimelineEventType.promptResponse
        ? (trigger as PromptResponseEvent)
        : undefined;
    if (!userMessage && !promptResponse) {
      continue;
    }

    const terminal = lastExecutionTerminal(group);
    if (!terminal) {
      continue;
    }

    const startedEvent = group.find((event) => event.type === TimelineEventType.executionStarted);
    const round: ConversationRound = {
      id: execution.roundId,
      input: userMessage?.data ?? promptResponse?.data.input ?? { message: '' },
      started_at: userMessage?.created_at ?? startedEvent?.created_at ?? terminal.created_at,
      ...authorAndOrigin(userMessage?.actor),
      ...runFields(terminal, stepsOf(group), answered),
    };

    const bucket = buckets.get(execution.roundId);
    const partial = { index: execution.index, round };
    if (bucket) {
      bucket.push(partial);
    } else {
      buckets.set(execution.roundId, [partial]);
    }
  }

  const rounds: ConversationRound[] = [];
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => a.index - b.index);
    // An orphan resume (no initial execution) has no input or author to build a round from.
    if (bucket[0].index !== 0) {
      continue;
    }
    rounds.push(
      bucket.slice(1).reduce((acc, next) => mergeResume(acc, next.round), bucket[0].round)
    );
  }

  // `executions` iterates in first-seen order of the stored events, which is not guaranteed to be
  // chronological. Sort explicitly (stable) so RAMEN can rely on round-start order.
  return rounds.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
};

/**
 * The rounds to return for a stored conversation document.
 *
 * Events are authoritative only for events-native documents (Agent Builder's live chat appends
 * events without rewriting `conversation_rounds`, so the stored rounds can lag behind). Legacy
 * documents keep their stored rounds, even if they carry transitional events.
 *
 * `feedback` lives on stored rounds only, so it is carried over onto the folded round.
 */
export const roundsForDocument = ({
  schemaVersion,
  storedRounds,
  events,
}: {
  schemaVersion: number | undefined;
  storedRounds: ConversationRound[] | undefined;
  events: ConversationEvent[] | undefined;
}): ConversationRound[] => {
  const stored = deserializeConversationRounds(storedRounds ?? []);
  if (!isEventsNativeVersion(schemaVersion) || !events?.length) {
    return stored;
  }
  const storedById = new Map(stored.map((round) => [round.id, round]));
  return roundsFromEvents(events).map((round) => {
    const feedback = storedById.get(round.id)?.feedback;
    return feedback ? { ...round, feedback } : round;
  });
};

// ---------------------------------------------------------------------------------------------
// rounds -> events (projection)
// ---------------------------------------------------------------------------------------------

const derivedIds = (roundId: string) => ({
  userMessage: roundUserMessageEventId(roundId),
  executionStarted: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted}`,
  executionTerminated: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated}`,
  executionFailed: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionFailed}`,
  executionAborted: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionAborted}`,
  execution: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`,
});

const userActor = (
  round: Pick<ConversationRound, 'author' | 'origin'>,
  ctx: ActorContext
): EventActor => {
  const type = round.origin ? EventActorType.external : EventActorType.user;
  const origin: { origin?: ConversationRoundOrigin } = round.origin ? { origin: round.origin } : {};
  if (round.author) {
    return {
      type,
      id: round.author.id,
      ...(round.author.username ? { username: round.author.username } : {}),
      ...(round.author.full_name ? { full_name: round.author.full_name } : {}),
      ...origin,
    };
  }
  return { type, id: ctx.userId ?? ctx.username, username: ctx.username, ...origin };
};

/** The terminal outcome for a round's status; `undefined` for an in-progress round. */
const outcomeForRound = (round: ConversationRound): ExecutionOutcome | undefined => {
  if (round.status === ConversationRoundStatus.completed) {
    return { type: 'responded', response: round.response ?? { message: '' } };
  }
  if (round.status === ConversationRoundStatus.awaitingPrompt) {
    return { type: 'prompt_requested', prompts: round.pending_prompts ?? [] };
  }
  return undefined;
};

const terminalEvent = (
  round: ConversationRound,
  ctx: ActorContext
): ConversationEvent | undefined => {
  const ids = derivedIds(round.id);
  const timeToLastToken = round.time_to_last_token || 0;
  const base = {
    created_at: new Date(new Date(round.started_at).getTime() + timeToLastToken).toISOString(),
    actor: { type: EventActorType.agent, id: ctx.agentId },
    execution_id: ids.execution,
    trigger_event_id: ids.userMessage,
  };
  const partialSummary = {
    time_to_last_token: timeToLastToken,
    time_to_first_token: round.time_to_first_token || 0,
    ...(round.model_usage ? { model_usage: round.model_usage } : {}),
    ...(round.trace_id ? { trace_id: round.trace_id } : {}),
    ...(round.configuration_overrides
      ? { configuration_overrides: round.configuration_overrides }
      : {}),
  };

  const interruption: ExecutionInterruption | undefined = round.interruption;
  if (interruption?.type === 'failed') {
    return {
      ...base,
      id: ids.executionFailed,
      type: TimelineEventType.executionFailed,
      data: { ...partialSummary, error: interruption.error },
    };
  }
  if (interruption?.type === 'aborted') {
    return {
      ...base,
      id: ids.executionAborted,
      type: TimelineEventType.executionAborted,
      data: {
        ...partialSummary,
        ...(interruption.aborted_by ? { aborted_by: interruption.aborted_by } : {}),
      },
    };
  }

  const outcome = outcomeForRound(round);
  if (!outcome) {
    return undefined;
  }
  return {
    ...base,
    id: ids.executionTerminated,
    type: TimelineEventType.executionTerminated,
    data: {
      ...partialSummary,
      model_usage: round.model_usage ?? ZERO_MODEL_USAGE,
      ...(outcome.type === 'prompt_requested' && round.state ? { state: round.state } : {}),
      outcome,
    },
  };
};

/**
 * Projects one round onto the timeline: `user_message` (the full round input, including
 * `attachment_refs`), `execution_started`, one `execution_step` per step and a terminal event
 * matching the round's status (none for an in-progress round).
 */
export const roundToEvents = (round: ConversationRound, ctx: ActorContext): ConversationEvent[] => {
  const ids = derivedIds(round.id);
  const agent = { type: EventActorType.agent, id: ctx.agentId };
  const terminal = terminalEvent(round, ctx);
  return [
    {
      id: ids.userMessage,
      type: TimelineEventType.userMessage,
      created_at: round.started_at,
      actor: userActor(round, ctx),
      data: round.input,
    },
    {
      id: ids.executionStarted,
      type: TimelineEventType.executionStarted,
      created_at: round.started_at,
      actor: agent,
      execution_id: ids.execution,
      trigger_event_id: ids.userMessage,
      data: { trigger_type: TimelineTriggerType.userMessage },
    },
    ...(round.steps ?? []).map((step, sequence) => ({
      id: roundStepEventId(round.id, sequence),
      type: TimelineEventType.executionStep,
      created_at: round.started_at,
      actor: agent,
      execution_id: ids.execution,
      trigger_event_id: ids.userMessage,
      data: { step, sequence },
    })),
    ...(terminal ? [terminal] : []),
  ];
};

export const eventsFromRounds = (
  rounds: ConversationRound[],
  ctx: ActorContext
): ConversationEvent[] => rounds.flatMap((round) => roundToEvents(round, ctx));

// ---------------------------------------------------------------------------------------------
// Reconciliation on a rounds write (PUT)
// ---------------------------------------------------------------------------------------------

const ROUND_DERIVED_SUFFIXES: readonly string[] = [
  ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionFailed,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionAborted,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.execution,
];
const STEP_EVENT_ID_PATTERN = /::step::\d+$/;
const PROMPT_RESPONSE_EVENT_ID_PATTERN = /::prompt_response::\d+$/;

/** True for ids produced from a round (same rule as Agent Builder's `isRoundDerivedEventId`). */
export const isRoundDerivedEventId = (id: string): boolean =>
  ROUND_DERIVED_SUFFIXES.some((suffix) => id.endsWith(suffix)) ||
  STEP_EVENT_ID_PATTERN.test(id) ||
  PROMPT_RESPONSE_EVENT_ID_PATTERN.test(id);

const roundIdOf = (id: string): string => id.split(CONVERSATION_EVENT_ID_DELIMITER)[0];

const hasResumeExecution = (block: ConversationEvent[]): boolean =>
  block.some((event) => {
    const execution = event.execution_id ? parseExecutionId(event.execution_id) : undefined;
    return execution !== undefined && execution.index > 0;
  });

/**
 * Rebuilds the timeline for a rounds write without destroying what flat rounds cannot express.
 *
 * - Additive/custom events (anything not derived from a round) are kept, re-inserted by
 *   `created_at`.
 * - A stored round block is regenerated from the submitted round, except when it spans a HITL
 *   resume, or when it has terminated but the submitted copy is still in progress: then the
 *   stored block is kept as is.
 * - A stored block absent from the submitted rounds is dropped only when the caller could see it
 *   (`visibleRoundIds`, the rounds GET returned) or it has a terminal outcome; otherwise (in
 *   progress, never returned) it is kept.
 * - Submitted rounds with no stored block are appended in order.
 */
export const reconcileEvents = ({
  storedEvents,
  rounds,
  visibleRoundIds,
  ctx,
}: {
  storedEvents: ConversationEvent[];
  rounds: ConversationRound[];
  visibleRoundIds: ReadonlySet<string>;
  ctx: ActorContext;
}): ConversationEvent[] => {
  const additive = storedEvents.filter((event) => !isRoundDerivedEventId(event.id));
  const roundsById = new Map(rounds.map((round) => [round.id, round]));

  const blocks = new Map<string, ConversationEvent[]>();
  for (const event of storedEvents) {
    if (!isRoundDerivedEventId(event.id)) {
      continue;
    }
    const roundId = roundIdOf(event.id);
    const block = blocks.get(roundId);
    if (block) {
      block.push(event);
    } else {
      blocks.set(roundId, [event]);
    }
  }

  const events: ConversationEvent[] = [];
  for (const [roundId, block] of blocks) {
    const round = roundsById.get(roundId);
    const terminal = lastExecutionTerminal(block);
    if (round) {
      const wouldRegress = terminal !== undefined && outcomeForRound(round) === undefined;
      const keepStored = hasResumeExecution(block) || (wouldRegress && !round.interruption);
      events.push(...(keepStored ? block : roundToEvents(round, ctx)));
    } else if (!visibleRoundIds.has(roundId) && terminal === undefined) {
      events.push(...block);
    }
  }
  for (const round of rounds) {
    if (!blocks.has(round.id)) {
      events.push(...roundToEvents(round, ctx));
    }
  }

  for (const event of additive) {
    const insertAt = events.findIndex((existing) => existing.created_at > event.created_at);
    if (insertAt === -1) {
      events.push(event);
    } else {
      events.splice(insertAt, 0, event);
    }
  }
  return events;
};

/**
 * The `events` to persist when a caller writes `rounds`. An events-native document is reconciled
 * against its stored timeline; anything else (new or legacy document) is projected from scratch.
 */
export const eventsForRoundsWrite = ({
  schemaVersion,
  storedRounds,
  storedEvents,
  rounds,
  ctx,
}: {
  schemaVersion: number | undefined;
  storedRounds: ConversationRound[] | undefined;
  storedEvents: ConversationEvent[] | undefined;
  rounds: ConversationRound[];
  ctx: ActorContext;
}): ConversationEvent[] => {
  if (!isEventsNativeVersion(schemaVersion) || !storedEvents?.length) {
    return eventsFromRounds(rounds, ctx);
  }
  const visible = roundsForDocument({ schemaVersion, storedRounds, events: storedEvents });
  return reconcileEvents({
    storedEvents,
    rounds,
    visibleRoundIds: new Set(visible.map((round) => round.id)),
    ctx,
  });
};

export const conversationSchemaVersion = CONVERSATION_SCHEMA_VERSION;
export { isEventsNativeVersion };
