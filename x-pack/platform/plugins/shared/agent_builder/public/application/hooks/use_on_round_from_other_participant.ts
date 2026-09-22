/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef } from 'react';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationRounds, useConversationStatus } from './use_conversation';
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';

interface Baseline {
  conversationId: string | undefined;
  roundCount: number;
}

/**
 * Calls `onRoundFromOtherParticipant` when a round appears that this client did not produce, i.e.
 * a refetch picked up another participant's round. Runs as a layout effect so callers can react
 * before the browser reflows the taller content.
 */
export const useOnRoundFromOtherParticipant = (onRoundFromOtherParticipant: () => void) => {
  const conversationId = useConversationId();
  const { isFetched } = useConversationStatus();
  const isStreaming = useIsCurrentConversationStreaming();
  const roundCount = useConversationRounds().length;

  const baseline = useRef<Baseline | undefined>(undefined);

  useLayoutEffect(() => {
    if (!isFetched) {
      return;
    }

    const previous = baseline.current;

    baseline.current = { conversationId, roundCount };

    // The rounds a conversation already had when it loaded are not new to anyone.
    if (!previous || previous.conversationId !== conversationId) {
      return;
    }

    if (roundCount <= previous.roundCount) {
      return;
    }

    if (isStreaming) {
      return;
    }

    onRoundFromOtherParticipant();
  }, [conversationId, roundCount, isStreaming, isFetched, onRoundFromOtherParticipant]);
};
