/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

const DISTANCE_FROM_BOTTOM_THRESHOLD = 50; // pixels
const SCROLL_POSITION_CHECK_INTERVAL = 1500; // milliseconds
const DEBOUNCE_DELAY = 20; // milliseconds

const scrollToMostRecentRound = ({
  scrollContainer,
  position,
  scrollBehavior = 'smooth',
}: {
  scrollContainer: HTMLDivElement;
  position: ScrollLogicalPosition;
  scrollBehavior?: ScrollBehavior;
}) => {
  requestAnimationFrame(() => {
    // Find the rounds container within the specific scroll container
    const conversationRoundsElement = scrollContainer.querySelector(
      '[id="agentBuilderConversationRoundsContainer"]'
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

const checkScrollPosition = (
  scrollContainer: HTMLDivElement,
  setShowScrollButton: (show: boolean) => void
) => {
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
  setShowScrollButton(distanceFromBottom > DISTANCE_FROM_BOTTOM_THRESHOLD);
};

const createDebouncedCheckScrollPosition = (
  scrollContainer: HTMLDivElement,
  setShowScrollButton: (show: boolean) => void
) => {
  let debounceTimeout: NodeJS.Timeout;

  return () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(
      () => checkScrollPosition(scrollContainer, setShowScrollButton),
      DEBOUNCE_DELAY
    );
  };
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

    const debouncedCheckScrollPosition = createDebouncedCheckScrollPosition(
      scrollContainer,
      setShowScrollButton
    );

    scrollContainer.addEventListener('scroll', debouncedCheckScrollPosition);

    // Set up interval for streaming check (only when response is loading)
    let interval: NodeJS.Timeout | undefined;
    if (isResponseLoading) {
      interval = setInterval(
        () => checkScrollPosition(scrollContainer, setShowScrollButton),
        SCROLL_POSITION_CHECK_INTERVAL
      );
    } else {
      // when the content stops streaming, check the scroll position
      checkScrollPosition(scrollContainer, setShowScrollButton);
    }

    return () => {
      scrollContainer.removeEventListener('scroll', debouncedCheckScrollPosition);
      if (interval) clearInterval(interval);
    };
  }, [isResponseLoading, conversationId, scrollContainer]);

  const stickToBottom = useCallback(() => {
    if (!scrollContainer) {
      return;
    }
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, [scrollContainer]);

  // Scrolls the most recent round to the top of it's parent scroll container
  const scrollToMostRecentRoundTop = useCallback(() => {
    if (!scrollContainer) return;
    requestAnimationFrame(() => {
      scrollToMostRecentRound({ scrollContainer, position: 'start' });
    });
  }, [scrollContainer]);

  // Smoothly scrolls to the bottom of the scroll container
  const smoothScrollToBottom = useCallback(() => {
    if (!scrollContainer) return;
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth',
    });
  }, [scrollContainer]);

  return {
    showScrollButton,
    scrollToMostRecentRoundTop,
    smoothScrollToBottom,
    stickToBottom,
  };
};
