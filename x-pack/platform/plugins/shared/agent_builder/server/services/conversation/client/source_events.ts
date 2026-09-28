/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, TimelineEvent } from '@kbn/agent-builder-common';
import { isEventsNativeVersion, isTimelineEvent } from '@kbn/agent-builder-common';
import { roundsToEvents } from './rounds_to_events';

/**
 * The raw events a reader folds: the stored timeline events when the document is events-native,
 * else its rounds projected to events. Every raw-events reader (`getPendingTurn`,
 * `getPendingResumeRound`, `legacyEligibleRoundIds`) shares this so they cannot disagree on the
 * source.
 */
export const sourceEvents = (conversation: Conversation): TimelineEvent[] =>
  !isEventsNativeVersion(conversation.schema_version) || !conversation.events?.length
    ? roundsToEvents(conversation)
    : conversation.events.filter(isTimelineEvent);
