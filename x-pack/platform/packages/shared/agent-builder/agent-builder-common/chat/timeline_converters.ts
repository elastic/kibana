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
  AgentResponseEvent,
  TimelineConversation,
} from './conversation';
import { TimelineEventType, isUserMessageEvent, isAgentResponseEvent } from './conversation';

/**
 * Converts a list of conversation rounds to timeline events.
 * Each round produces a UserMessageEvent (from the round input)
 * followed by an AgentResponseEvent (from the round data).
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

    // Agent response event from the round data
    const agentEvent: AgentResponseEvent = {
      id: round.id,
      timestamp: round.started_at,
      type: TimelineEventType.agent_response,
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
 * Pairs each UserMessageEvent with the following AgentResponseEvent.
 * Needed during phase 1 while the ConversationClient still returns rounds.
 */
export const timelineEventsToRounds = (events: TimelineEvent[]): ConversationRound[] => {
  const rounds: ConversationRound[] = [];
  let pendingUserMessage: UserMessageEvent | undefined;

  for (const event of events) {
    if (isUserMessageEvent(event)) {
      pendingUserMessage = event;
    } else if (isAgentResponseEvent(event)) {
      const round: ConversationRound = {
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
      };
      rounds.push(round);
      pendingUserMessage = undefined;
    }
  }

  return rounds;
};

/**
 * Converts a Conversation (rounds-based) to a TimelineConversation (timeline-based).
 */
export const conversationToTimelineConversation = (
  conversation: Conversation
): TimelineConversation => {
  const timeline = roundsToTimelineEvents(
    conversation.rounds,
    conversation.user,
    conversation.agent_id
  );

  return {
    id: conversation.id,
    agent_id: conversation.agent_id,
    user: conversation.user,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    attachments: conversation.attachments,
    state: conversation.state,
    timeline,
  };
};

/**
 * Converts a TimelineConversation back to a Conversation (rounds-based).
 */
export const timelineConversationToConversation = (
  executionConversation: TimelineConversation
): Conversation => {
  const rounds = timelineEventsToRounds(executionConversation.timeline);

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
  };
};

/**
 * Converts an AgentResponseEvent back to a ConversationRound.
 * Requires the associated UserMessageEvent to reconstruct the input.
 */
export const agentResponseEventToRound = (
  agentResponse: AgentResponseEvent,
  userMessage?: UserMessageEvent
): ConversationRound => {
  return {
    id: agentResponse.id,
    status: agentResponse.status,
    state: agentResponse.state,
    pending_prompts: agentResponse.pending_prompts,
    input: {
      message: userMessage?.message ?? '',
      attachments: userMessage?.attachments,
      attachment_refs: userMessage?.attachment_refs,
    },
    steps: agentResponse.steps,
    response: agentResponse.response,
    started_at: agentResponse.started_at,
    time_to_first_token: agentResponse.time_to_first_token,
    time_to_last_token: agentResponse.time_to_last_token,
    model_usage: agentResponse.model_usage,
    trace_id: agentResponse.trace_id,
    configuration_overrides: agentResponse.configuration_overrides,
  };
};
