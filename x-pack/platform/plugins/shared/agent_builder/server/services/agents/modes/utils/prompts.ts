/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  ExecutionConversation,
} from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { getRoundsFromConversation } from './conversation_format';

export const getPendingRound = (
  conversation: Conversation | ExecutionConversation | undefined
): ConversationRound | undefined => {
  const rounds = getRoundsFromConversation(conversation);
  const lastRound = rounds[rounds.length - 1];
  if (lastRound?.status === ConversationRoundStatus.awaitingPrompt) {
    return lastRound;
  }
  return undefined;
};
