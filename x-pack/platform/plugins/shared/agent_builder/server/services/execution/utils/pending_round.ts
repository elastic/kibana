/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationOriginType,
  ConversationRound,
} from '@kbn/agent-builder-common';
import { parseExecutionId, pendingPromptRequest } from '@kbn/agent-builder-common';
import { eventsToRounds } from '../../conversation/client/events_to_rounds';
import { sourceEvents } from '../../conversation/client/source_events';

/**
 * The paused round the next input resumes, when there is one.
 *
 * Decided on the conversation's events, not on its stored `rounds`: a document written before
 * interrupted resumes consumed the prompt can still store the round as `awaiting_prompt`.
 *
 * @param conversation - Conversation as it was read at the start of the run.
 * @returns The paused round (as folded from the events), or undefined when the next input starts a fresh round.
 */
export const getPendingResumeRound = (
  conversation: Conversation
): ConversationRound | undefined => {
  const events = sourceEvents(conversation);
  const pending = pendingPromptRequest(events);
  if (!pending?.execution_id) {
    return undefined;
  }
  const roundId = parseExecutionId(pending.execution_id)?.roundId ?? pending.execution_id;
  return eventsToRounds(events).find((round) => round.id === roundId);
};

/**
 * Origin to attribute a run's telemetry to.
 *
 * @param conversation - Conversation as it was read at the start of the run.
 * @param requestOrigin - Origin carried by the current request, if any.
 * @returns The request's origin when it has one, otherwise the paused round's origin.
 */
export const resolveTelemetryOrigin = ({
  conversation,
  requestOrigin,
}: {
  conversation?: Conversation;
  requestOrigin?: ConversationOriginType;
}): ConversationOriginType | undefined => {
  if (requestOrigin) {
    return requestOrigin;
  }
  return conversation ? getPendingResumeRound(conversation)?.origin?.type : undefined;
};
