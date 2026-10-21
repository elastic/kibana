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
import type { TimelineDisplayEvent } from '../../services/events';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationStreamService } from '../context/streaming/streaming_context';

const EMPTY_EVENTS: TimelineDisplayEvent[] = [];

/** The live (streamed) events of the current conversation; empty when nothing streams. */
export const useLiveEvents = (): TimelineDisplayEvent[] => {
  const conversationId = useConversationId();
  const conversationStreamService = useConversationStreamService();

  const activeStream$: Observable<TimelineDisplayEvent[]> = useMemo(
    () =>
      conversationId
        ? conversationStreamService.getActiveStream$(conversationId)
        : of(EMPTY_EVENTS),
    [conversationStreamService, conversationId]
  );
  return useObservable(activeStream$, EMPTY_EVENTS);
};
