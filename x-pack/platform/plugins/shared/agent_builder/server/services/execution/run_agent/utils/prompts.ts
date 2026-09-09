/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, TimelineEvent } from '@kbn/agent-builder-common';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import { groupTimelineRounds, isAwaitingPrompt } from './context_timeline';

/**
 * The round paused for human input, when the last round is one. Only that round is reconstructed,
 * as a `ConversationRound`, because resuming (merging the follow-up, replaying pending actions)
 * operates on the rounds model.
 */
export const getPendingRound = (timeline: TimelineEvent[]): ConversationRound | undefined => {
  const rounds = groupTimelineRounds(timeline);
  const lastRound = rounds[rounds.length - 1];
  if (!lastRound || !isAwaitingPrompt(lastRound)) {
    return undefined;
  }
  return eventsToRounds(lastRound.events)[0];
};
