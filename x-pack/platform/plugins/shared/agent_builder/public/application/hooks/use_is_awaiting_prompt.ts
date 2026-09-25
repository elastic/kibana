/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isTimelineEvent } from '@kbn/agent-builder-common';
import { mergeEventsById } from '../components/conversations/timeline/merge_events';
import { findAwaitingPromptEventId } from '../components/conversations/timeline/awaiting_prompt';
import { useConversation } from './use_conversation';
import { useLiveEvents } from './use_live_events';

/**
 * True while the conversation waits for a human to answer a prompt, read from the same saved and
 * live events the timeline renders, so the input gate and the timeline can never disagree.
 */
export const useIsAwaitingPrompt = (): boolean => {
  const { conversation } = useConversation();
  const liveEvents = useLiveEvents();
  const savedEvents = conversation?.events?.filter(isTimelineEvent);

  return useMemo(
    () => Boolean(findAwaitingPromptEventId(mergeEventsById(savedEvents ?? [], liveEvents))),
    [savedEvents, liveEvents]
  );
};
