/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { isTimelineEvent } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../services/events';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationStreamService } from '../context/streaming/streaming_context';
import { mergeEventsById } from '../components/conversations/timeline/merge_events';
import type { OutstandingPrompt } from '../components/conversations/timeline/outstanding_prompt';
import { findOutstandingPrompt } from '../components/conversations/timeline/outstanding_prompt';
import { useConversation } from './use_conversation';

const EMPTY_EVENTS: TimelineDisplayEvent[] = [];

/**
 * The prompts the conversation is waiting on, read from the same saved and live events the
 * timeline renders. Undefined when nothing is pending.
 */
export const useOutstandingPrompt = (): OutstandingPrompt | undefined => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const conversationStreamService = useConversationStreamService();

  const activeStream$: Observable<TimelineDisplayEvent[]> = useMemo(
    () =>
      conversationId
        ? conversationStreamService.getActiveStream$(conversationId)
        : of(EMPTY_EVENTS),
    [conversationStreamService, conversationId]
  );
  const liveEvents = useObservable(activeStream$, EMPTY_EVENTS);
  const savedEvents = conversation?.events?.filter(isTimelineEvent);

  return useMemo(
    () => findOutstandingPrompt(mergeEventsById(savedEvents ?? [], liveEvents)),
    [savedEvents, liveEvents]
  );
};

/** True while the conversation waits for a human to answer a prompt. */
export const useIsAwaitingPrompt = (): boolean => Boolean(useOutstandingPrompt());
