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
import { ConversationRoundStatus } from '@kbn/agent-builder-common';

/**
 * The paused round the next input resumes, when there is one.
 *
 * @param conversation - Conversation as it was read at the start of the run.
 * @returns The paused round, or undefined when the next input starts a fresh round.
 */
export const getPendingResumeRound = (
  conversation: Pick<Conversation, 'rounds'>
): ConversationRound | undefined => {
  const lastRound = conversation.rounds[conversation.rounds.length - 1];
  return lastRound?.status === ConversationRoundStatus.awaitingPrompt ? lastRound : undefined;
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
  conversation?: Pick<Conversation, 'rounds'>;
  requestOrigin?: ConversationOriginType;
}): ConversationOriginType | undefined => {
  if (requestOrigin) {
    return requestOrigin;
  }
  return conversation ? getPendingResumeRound(conversation)?.origin?.type : undefined;
};
