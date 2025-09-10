/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

const DISTANCE_FROM_BOTTOM_THRESHOLD = 50; // pixels
const SCROLL_POSITION_CHECK_INTERVAL = 1500; // milliseconds

const scrollToMostRecentRound = ({
  position,
  scrollBehavior = 'smooth',
}: {
  position: ScrollLogicalPosition;
  scrollBehavior?: ScrollBehavior;
}) => {
  requestAnimationFrame(() => {
    const conversationRoundsElement = document.querySelector(
      '[id="onechatConversationRoundsContainer"]'
    );
    if (conversationRoundsElement) {
      const rounds = conversationRoundsElement.children;
      if (rounds.length >= 1) {
        // Get the last round (the user's last message)
        const lastRound = rounds[rounds.length - 1] as HTMLElement;
        lastRound.scrollIntoView({
          behavior: scrollBehavior,
          block: position,
        });
      }
    }
  });
};

// Scrolls the most recent round to the top of it's parent scroll container
const scrollToMostRecentRoundTop = () => {
  scrollToMostRecentRound({ position: 'start' });
};

// Scrolls the most recent round to the bottom of it's parent scroll container
const scrollToMostRecentRoundBottom = () => {
  scrollToMostRecentRound({ position: 'end' });
};

export const useConversationScrollActions = ({
  isResponseLoading,
  conversationId,
  scrollContainer,
}: {
  isResponseLoading: boolean;
  conversationId: string;
  scrollContainer: HTMLDivElement | null;
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (!scrollContainer) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      setShowScrollButton(distanceFromBottom > DISTANCE_FROM_BOTTOM_THRESHOLD);
    };

    scrollContainer.addEventListener('scroll', checkScrollPosition);

    // Set up interval for streaming check (only when response is loading)
    let interval: NodeJS.Timeout | undefined;
    if (isResponseLoading) {
      interval = setInterval(checkScrollPosition, SCROLL_POSITION_CHECK_INTERVAL);
    }

    return () => {
      scrollContainer.removeEventListener('scroll', checkScrollPosition);
      if (interval) clearInterval(interval);
    };
  }, [isResponseLoading, conversationId, scrollContainer]);

  const stickToBottom = useCallback(() => {
    if (!scrollContainer) {
      return;
    }
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [scrollContainer]);

  return {
    showScrollButton,
    scrollToMostRecentRoundTop,
    scrollToMostRecentRoundBottom,
    stickToBottom,
  };
};
