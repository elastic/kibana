/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInternalError,
  isExecutionTerminatedEvent,
  isNonInteractiveDeclinedResult,
  isToolResultEvent,
  type ChatEvent,
  type ExecutionTerminatedEvent,
} from '@kbn/agent-builder-common';
import type {
  ChatMessageDeclinedPrompt,
  ChatMessageResponse,
} from '../../../../common/http_api/chat';
import { findConversationEvent } from './chat_response';

/**
 * Builds the `POST /api/chat/message` response from a non-interactive run's event stream. Reads
 * the timeline events the run emits so the answer is
 * the persisted `execution_terminated` outcome, and the auto-declined HITL prompts are the tagged
 * error results the agent received in place of them.
 */
export const buildChatMessageResponseFromEvents = (events: ChatEvent[]): ChatMessageResponse => {
  const conversationEvent = findConversationEvent(events);
  const terminatedEvent = events.find(isExecutionTerminatedEvent);
  if (!terminatedEvent) {
    throw createInternalError('No execution_terminated event was emitted by the agent run');
  }

  // `declined_prompts` only appears when there is something to report, so the common case stays
  // a two-field body.
  const declinedPrompts = declinedPromptsOf(events);
  return {
    conversation_id: conversationEvent.data.conversation_id,
    answer: answerOf(terminatedEvent),
    ...(declinedPrompts.length > 0 ? { declined_prompts: declinedPrompts } : {}),
  };
};

/** The agent's final text output. */
const answerOf = ({ data: { outcome } }: ExecutionTerminatedEvent): string => {
  if (outcome.type !== 'responded') {
    throw createInternalError(
      'The agent asked for user input during a non-interactive run instead of declining the prompt'
    );
  }
  return outcome.response.message;
};

/** The HITL prompts the run declined, one entry per tagged tool result, in call order. */
const declinedPromptsOf = (events: ChatEvent[]): ChatMessageDeclinedPrompt[] =>
  events.filter(isToolResultEvent).flatMap(({ data: { tool_id: toolId, results } }) =>
    results.filter(isNonInteractiveDeclinedResult).map(({ data: { message } }) => ({
      tool_id: toolId,
      message,
    }))
  );
