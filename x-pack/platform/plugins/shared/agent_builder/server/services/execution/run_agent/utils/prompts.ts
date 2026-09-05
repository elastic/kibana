/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';

/**
 * Returns the last round when it is paused awaiting a human prompt (HITL), else undefined.
 * Takes the reconstructed context rounds (derived from the event timeline), so pause detection
 * uses the same source as message building and cannot diverge from it.
 */
export const getPendingRound = (rounds: ConversationRound[]): ConversationRound | undefined => {
  const lastRound = rounds[rounds.length - 1];
  if (lastRound?.status === ConversationRoundStatus.awaitingPrompt) {
    return lastRound;
  }
  return undefined;
};
