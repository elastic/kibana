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
 * Takes reconstructed context rounds so pause detection and message building read the same rounds.
 */
export const getPendingRound = (rounds: ConversationRound[]): ConversationRound | undefined => {
  const lastRound = rounds[rounds.length - 1];
  if (lastRound?.status === ConversationRoundStatus.awaitingPrompt) {
    return lastRound;
  }
  return undefined;
};
