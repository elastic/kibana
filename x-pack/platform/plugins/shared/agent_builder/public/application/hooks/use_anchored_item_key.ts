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
  const wasActive = useRef(false);
  const lastKey = useRef<string>();
  const [anchor, setAnchor] = useState<{ conversationId?: string; index: number }>();

  useEffect(() => {
    if (isActive && !wasActive.current) {
      setAnchor({ conversationId, index: items.length });
    }
    wasActive.current = isActive;
  }, [isActive, conversationId, items.length]);

  if (!anchor || anchor.conversationId !== conversationId) {
    lastKey.current = undefined;
    return undefined;
  }
  // Between a send and its item appearing, keep the previous anchor so the space below it does
  // not collapse and move the scroll position.
  lastKey.current = items[anchor.index]?.key ?? lastKey.current;
  return lastKey.current;
};
