/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type {
  Conversation,
  ConversationRound,
  TimelineEvent,
  UserMessageEvent,
  AgentExecutionEvent,
  TimelineConversation,
  UserActionEvent,
} from './conversation';
import {
  TimelineEventType,
  ConversationRoundStatus,
  isUserMessageEvent,
  isAgentExecutionEvent,
  isUserActionEvent,
  isTimelineConversation,
} from './conversation';

export interface ConversationRoundEntry {
  round: ConversationRound;
  author?: UserIdAndName;
}

export type ConversationActivityEntry =
  | { type: 'round'; round: ConversationRound; author?: UserIdAndName }
  | { type: 'user_action'; event: UserActionEvent };

/**
 * Converts a list of conversation rounds to timeline events.
 * Each round produces a UserMessageEvent (from the round input)
 * followed by an AgentExecutionEvent (from the round data).
 */
export const roundsToTimelineEvents = (
  rounds: ConversationRound[],
  user: UserIdAndName,
  agentId: string
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  for (const round of rounds) {
    // User message event - derive ID from round ID
    const userEvent: UserMessageEvent = {
      id: `msg-${round.id}`,
      timestamp: round.started_at,
      type: TimelineEventType.user_message,
      user,
      message: round.input.message,
      attachments: round.input.attachments,
      attachment_refs: round.input.attachment_refs,
    };
    events.push(userEvent);

    // Agent execution event from the round data
    const agentEvent: AgentExecutionEvent = {
      id: round.id,
      timestamp: round.started_at,
      type: TimelineEventType.agentExecution,
      agent_id: agentId,
      status: round.status,
      state: round.state,
      pending_prompts: round.pending_prompts,
      steps: round.steps,
      response: round.response,
      started_at: round.started_at,
      time_to_first_token: round.time_to_first_token,
      time_to_last_token: round.time_to_last_token,
      model_usage: round.model_usage,
      trace_id: round.trace_id,
      configuration_overrides: round.configuration_overrides,
    };
    events.push(agentEvent);
  }

  return events;
};

/**
 * Converts timeline events back to conversation rounds.
 * Pairs each UserMessageEvent with the following AgentExecutionEvent.
 * Trailing user messages without an agent run become human-note rounds (collaborative chat).
 */
export const timelineEventsToRounds = (events: TimelineEvent[]): ConversationRound[] => {
  return timelineEventsToRoundEntries(events).map(({ round }) => round);
};

const buildRoundFromAgentExecution = (
  event: AgentExecutionEvent,
  pendingUserMessage: UserMessageEvent | undefined
): ConversationRound => ({
  id: event.id,
  status: event.status,
  state: event.state,
  pending_prompts: event.pending_prompts,
  input: {
    message: pendingUserMessage?.message ?? '',
    attachments: pendingUserMessage?.attachments,
    attachment_refs: pendingUserMessage?.attachment_refs,
  },
  steps: event.steps,
  response: event.response,
  started_at: event.started_at,
  time_to_first_token: event.time_to_first_token,
  time_to_last_token: event.time_to_last_token,
  model_usage: event.model_usage,
  trace_id: event.trace_id,
  configuration_overrides: event.configuration_overrides,
});

const buildHumanNoteRound = (userMessage: UserMessageEvent): ConversationRound => ({
  id: userMessage.id,
  status: ConversationRoundStatus.completed,
  input: {
    message: userMessage.message,
    attachments: userMessage.attachments,
    attachment_refs: userMessage.attachment_refs,
  },
  steps: [],
  response: { message: '' },
  started_at: userMessage.timestamp,
  time_to_first_token: 0,
  time_to_last_token: 0,
  model_usage: {
    llm_calls: 0,
    input_tokens: 0,
    output_tokens: 0,
  },
});

/** Human-only note persisted without an agent execution event. */
export const isHumanNoteRound = (round: ConversationRound): boolean =>
  round.status === ConversationRoundStatus.completed &&
  round.steps.length === 0 &&
  round.response.message === '' &&
  round.model_usage.llm_calls === 0;

const pendingHumanNoteEntry = (
  pendingUserMessage: UserMessageEvent | undefined
): ConversationActivityEntry | undefined => {
  if (!pendingUserMessage) {
    return undefined;
  }

  return {
    type: 'round',
    author: pendingUserMessage.user,
    round: buildHumanNoteRound(pendingUserMessage),
  };
};

export const timelineEventsToActivityEntries = (
  events: TimelineEvent[]
): ConversationActivityEntry[] => {
  const entries: ConversationActivityEntry[] = [];
  let pendingUserMessage: UserMessageEvent | undefined;

  for (const event of events) {
    if (isUserActionEvent(event)) {
      const humanNote = pendingHumanNoteEntry(pendingUserMessage);
      if (humanNote) {
        entries.push(humanNote);
      }
      pendingUserMessage = undefined;
      entries.push({ type: 'user_action', event });
      continue;
    }

    if (isUserMessageEvent(event)) {
      pendingUserMessage = event;
      continue;
    }

    if (isAgentExecutionEvent(event)) {
      entries.push({
        type: 'round',
        author: pendingUserMessage?.user,
        round: buildRoundFromAgentExecution(event, pendingUserMessage),
      });
      pendingUserMessage = undefined;
    }
  }

  if (pendingUserMessage) {
    entries.push({
      type: 'round',
      author: pendingUserMessage.user,
      round: buildHumanNoteRound(pendingUserMessage),
    });
  }

  return entries;
};

export const timelineEventsToRoundEntries = (events: TimelineEvent[]): ConversationRoundEntry[] => {
  return timelineEventsToActivityEntries(events).flatMap((entry) =>
    entry.type === 'round' ? [{ round: entry.round, author: entry.author }] : []
  );
};

/**
 * Converts a Conversation (rounds-based) to a TimelineConversation (events-based).
 */
export const mergeLegacyRoundsWithPersistedEvents = ({
  legacyRounds,
  persistedEvents,
  user,
  agentId,
}: {
  legacyRounds: ConversationRound[];
  persistedEvents: TimelineEvent[];
  user: UserIdAndName;
  agentId: string;
}): TimelineEvent[] => {
  if (!persistedEvents.length) {
    return legacyRounds.length ? roundsToTimelineEvents(legacyRounds, user, agentId) : [];
  }
  if (!legacyRounds.length) {
    return persistedEvents;
  }

  // Collaborative conversations persist agent runs in `events` while legacy
  // `conversation_rounds` may still contain the same rounds — skip duplicates.
  const legacyEvents = roundsToTimelineEvents(legacyRounds, user, agentId);
  const persistedEventIds = new Set(persistedEvents.map((event) => event.id));
  const uniqueLegacyEvents = legacyEvents.filter((event) => !persistedEventIds.has(event.id));

  return [...uniqueLegacyEvents, ...persistedEvents];
};

const asTimelineEvents = (events: TimelineEvent[] | undefined): TimelineEvent[] =>
  Array.isArray(events) ? events : [];

/**
 * Resolves chat events for agent execution from either conversation shape.
 * Prefers persisted `events` when present (already merged on read in `fromEs`).
 */
export const resolveConversationEvents = (
  conversation: Conversation | TimelineConversation
): TimelineEvent[] => {
  if (isTimelineConversation(conversation)) {
    return asTimelineEvents(conversation.events);
  }

  const persistedEvents = asTimelineEvents(conversation.events);
  if (persistedEvents.length > 0) {
    return persistedEvents;
  }

  return roundsToTimelineEvents(
    conversation.rounds ?? [],
    conversation.user,
    conversation.agent_id
  );
};

export const conversationToTimelineConversation = (
  conversation: Conversation
): TimelineConversation => {
  const events = resolveConversationEvents(conversation);

  return {
    id: conversation.id,
    agent_id: conversation.agent_id,
    user: conversation.user,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    attachments: conversation.attachments,
    state: conversation.state,
    events,
  };
};

/**
 * Converts a TimelineConversation back to a Conversation (rounds-based).
 */
export const timelineConversationToConversation = (
  executionConversation: TimelineConversation
): Conversation => {
  const rounds = timelineEventsToRounds(executionConversation.events);

  return {
    id: executionConversation.id,
    agent_id: executionConversation.agent_id,
    user: executionConversation.user,
    title: executionConversation.title,
    created_at: executionConversation.created_at,
    updated_at: executionConversation.updated_at,
    attachments: executionConversation.attachments,
    state: executionConversation.state,
    rounds,
    events: executionConversation.events,
  };
};

/**
 * Converts an AgentExecutionEvent back to a ConversationRound.
 * Requires the associated UserMessageEvent to reconstruct the input.
 */
export const agentExecutionEventToRound = (
  agentExecution: AgentExecutionEvent,
  userMessage?: UserMessageEvent
): ConversationRound => {
  return {
    id: agentExecution.id,
    status: agentExecution.status,
    state: agentExecution.state,
    pending_prompts: agentExecution.pending_prompts,
    input: {
      message: userMessage?.message ?? '',
      attachments: userMessage?.attachments,
      attachment_refs: userMessage?.attachment_refs,
    },
    steps: agentExecution.steps,
    response: agentExecution.response,
    started_at: agentExecution.started_at,
    time_to_first_token: agentExecution.time_to_first_token,
    time_to_last_token: agentExecution.time_to_last_token,
    model_usage: agentExecution.model_usage,
    trace_id: agentExecution.trace_id,
    configuration_overrides: agentExecution.configuration_overrides,
  };
};
