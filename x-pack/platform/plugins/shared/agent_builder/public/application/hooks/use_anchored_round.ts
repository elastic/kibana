/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationRounds } from './use_conversation';
import { useConversationStream } from './use_conversation_stream';

interface AnchorLatch {
  conversationId: string | undefined;
  index: number;
}

/**
 * Returns the index of the round that owns the viewport "anchor space" (a viewport-sized
 * min-height that pushes the user's input to the top of the container), or null.
 *
 * Only the LAST round can ever be anchored. It gets the anchor from the moment it becomes
 * active (streaming, errored, or awaiting a prompt) and keeps it until the conversation
 * moves on — meaning a newer round starts or the user switches conversations — NOT when
 * the stream finishes. Releasing the anchor at stream end would collapse the round's
 * blank space and make the scroll position visibly jump.
 */
export const useAnchoredRoundIndex = (): number | null => {
  const conversationId = useConversationId();
  const rounds = useConversationRounds();
  const { isResponseLoading, error, isResuming } = useConversationStream();
  const [latch, setLatch] = useState<AnchorLatch | null>(null);

  const lastIndex = rounds.length - 1;
  const lastRound = rounds.at(-1);
  const isAwaitingPrompt =
    lastRound?.status === ConversationRoundStatus.awaitingPrompt &&
    (lastRound.pending_prompts?.length ?? 0) > 0 &&
    !isResuming;
  const isLastRoundActive =
    lastIndex >= 0 && (isResponseLoading || Boolean(error) || isAwaitingPrompt);

  useEffect(() => {
    if (isLastRoundActive) {
      setLatch((prev) =>
        prev?.conversationId === conversationId && prev?.index === lastIndex
          ? prev
          : { conversationId, index: lastIndex }
      );
    }
  }, [isLastRoundActive, conversationId, lastIndex]);

  if (lastIndex < 0) {
    return null;
  }
  if (isLastRoundActive) {
    return lastIndex;
  }
  // Only the last round may hold the anchor: if the conversation gained rounds since
  // the latch was set (e.g. refreshed data from another session), the latch is stale.
  return latch?.conversationId === conversationId && latch?.index === lastIndex
    ? latch?.index
    : null;
};
