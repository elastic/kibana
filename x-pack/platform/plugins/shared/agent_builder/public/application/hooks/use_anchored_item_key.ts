/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useIsMutating } from '@kbn/react-query';
import { useTimelineItems } from '../components/conversations/timeline/use_timeline_items';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { mutationKeys } from '../mutation_keys';
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';

/**
 * Key of the timeline item the user's latest send appended: the item that landed at the position
 * recorded when the conversation became active (a stream started, or a message post began). Kept
 * after the stream ends so the space below it does not collapse; replaced on the next send.
 */
export const useAnchoredItemKey = (): string | undefined => {
  const conversationId = useConversationId();
  const items = useTimelineItems();
  const isStreaming = useIsCurrentConversationStreaming();
  const isPosting =
    useIsMutating({ mutationKey: mutationKeys.sendUserMessage(conversationId) }) > 0;
  const isActive = isStreaming || isPosting;
  const observed = useRef<{ conversationId?: string; active: boolean }>({ active: false });
  const lastKey = useRef<string>();
  const [anchor, setAnchor] = useState<{ index: number }>();

  useEffect(() => {
    const previous = observed.current;
    observed.current = { conversationId, active: isActive };
    // An anchor belongs to the send that created it. Moving to another conversation drops it and
    // never latches on entry, even if that conversation is streaming: the view sticks to the
    // bottom instead. Arriving from the new-conversation page is the first send landing, not
    // navigation, so it may latch.
    const navigated =
      previous.conversationId !== undefined && previous.conversationId !== conversationId;
    if (navigated) {
      setAnchor(undefined);
      return;
    }
    if (isActive && !previous.active) {
      setAnchor({ index: items.length });
    }
  }, [isActive, conversationId, items.length]);

  if (!anchor) {
    lastKey.current = undefined;
    return undefined;
  }
  // Between a send and its item appearing, keep the previous anchor so the space below it does
  // not collapse and move the scroll position.
  lastKey.current = items[anchor.index]?.key ?? lastKey.current;
  return lastKey.current;
};
