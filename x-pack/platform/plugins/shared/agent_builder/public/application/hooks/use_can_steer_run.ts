/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  TimelineEventType,
  isPublicConversation,
  isTimelineEvent,
  runTriggerEvent,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import { mergeEventsById } from '../components/conversations/timeline/merge_events';
import { useConversation } from './use_conversation';
import { useCurrentUser } from './use_current_user';
import { useLiveEvents$ } from './use_live_events';

/** The actor id of the message that started the latest run, when the events hold both. */
const latestRunSenderId = (events: ConversationEvent[]): string | undefined => {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (event.type === TimelineEventType.executionStarted && event.execution_id) {
      return runTriggerEvent(events, event.execution_id)?.actor.id;
    }
  }
  return undefined;
};

export type SteerEligibility =
  | { canSteer: true }
  | { canSteer: false; reason: 'public_conversation' | 'another_users_run' };

/**
 * Whether the current user may steer the run the conversation shows. The server refuses every
 * steer in a public conversation, and elsewhere admits only the user whose message started the
 * run. That user counts as the current one while unknown, as for a run whose start has not reached
 * the timeline yet, so the server has the last word.
 */
export const useCanSteerRun = (): SteerEligibility => {
  const { conversation } = useConversation();
  const liveEvents$ = useLiveEvents$();
  const { currentUser } = useCurrentUser();
  const docEvents = conversation?.events;

  // Only a change of the sender renders the caller, not every streamed event.
  const senderId$ = useMemo(() => {
    const savedEvents = (docEvents ?? []).filter(isTimelineEvent);
    return liveEvents$.pipe(
      map((liveEvents) =>
        latestRunSenderId(mergeEventsById(savedEvents, liveEvents).filter(isTimelineEvent))
      ),
      distinctUntilChanged()
    );
  }, [docEvents, liveEvents$]);
  const senderId = useObservable(senderId$, undefined);

  if (isPublicConversation(conversation?.access_control)) {
    return { canSteer: false, reason: 'public_conversation' };
  }
  if (senderId === undefined || !currentUser || senderId === currentUser.uid) {
    return { canSteer: true };
  }
  return { canSteer: false, reason: 'another_users_run' };
};
