/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef } from 'react';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationStatus } from './use_conversation';
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';
import { useTimelineItems } from '../components/conversations/timeline/use_timeline_items';
import { useCurrentUser } from './use_current_user';

interface Baseline {
  conversationId: string | undefined;
  userMessageCount: number;
}

/**
 * Calls `onMessageFromOtherParticipant` when a user message appears that this client did not
 * send, i.e. a refetch picked up another participant's message. Runs as a layout effect so callers
 * can react before the browser reflows the taller content.
 */
export const useOnMessageFromOtherParticipant = (onMessageFromOtherParticipant: () => void) => {
  const conversationId = useConversationId();
  const { isFetched } = useConversationStatus();
  const isStreaming = useIsCurrentConversationStreaming();
  const { currentUser } = useCurrentUser();
  const userMessages = useTimelineItems().filter((item) => item.kind === 'userMessage');
  const userMessageCount = userMessages.length;
  const latestUserMessage = userMessages.at(-1);
  const isLatestOwn =
    latestUserMessage?.kind === 'userMessage' &&
    latestUserMessage.event.actor.id === currentUser?.uid;

  const baseline = useRef<Baseline | undefined>(undefined);

  useLayoutEffect(() => {
    if (!isFetched) {
      return;
    }

    const previous = baseline.current;

    baseline.current = { conversationId, userMessageCount };

    // The messages a conversation already had when it loaded are not new to anyone.
    if (!previous || previous.conversationId !== conversationId) {
      return;
    }

    if (userMessageCount <= previous.userMessageCount) {
      return;
    }

    if (isStreaming || isLatestOwn) {
      return;
    }

    onMessageFromOtherParticipant();
  }, [
    conversationId,
    userMessageCount,
    isStreaming,
    isLatestOwn,
    isFetched,
    onMessageFromOtherParticipant,
  ]);
};
