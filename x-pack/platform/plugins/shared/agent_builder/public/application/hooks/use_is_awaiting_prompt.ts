/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { isTimelineEvent } from '@kbn/agent-builder-common';
import { mergeEventsById } from '../components/conversations/timeline/merge_events';
import { findAwaitingPromptEventId } from '../components/conversations/timeline/awaiting_prompt';
import { useConversation } from './use_conversation';
import { useLiveEvents$ } from './use_live_events';

/**
 * True while the conversation waits for a human to answer a prompt, read from the same saved and
 * live events the timeline renders, so the input gate and the timeline can never disagree.
 */
export const useIsAwaitingPrompt = (): boolean => {
  const { conversation } = useConversation();
  const liveEvents$ = useLiveEvents$();
  const docEvents = conversation?.events;

  // Only a change of the answer renders the caller, not every streamed event.
  const isAwaitingPrompt$ = useMemo(() => {
    const savedEvents = (docEvents ?? []).filter(isTimelineEvent);
    return liveEvents$.pipe(
      map((liveEvents) =>
        Boolean(findAwaitingPromptEventId(mergeEventsById(savedEvents, liveEvents)))
      ),
      distinctUntilChanged()
    );
  }, [docEvents, liveEvents$]);

  return useObservable(isAwaitingPrompt$, false);
};
