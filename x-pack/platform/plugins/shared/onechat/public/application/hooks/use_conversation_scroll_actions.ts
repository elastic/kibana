/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

const scrollToMostRecentRound = (
  position: ScrollLogicalPosition,
  scrollBehavior: ScrollBehavior = 'smooth'
) => {
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
    const parent = scrollContainer?.parentElement;
    if (!parent) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const threshold = 50;

      setShowScrollButton(distanceFromBottom > threshold);
    };

    // Set up scroll listener
    parent.addEventListener('scroll', checkScrollPosition);

    // Set up interval for streaming check (only when response is loading)
    let interval: NodeJS.Timeout | undefined;
    if (isResponseLoading) {
      interval = setInterval(checkScrollPosition, 1500);
    }

    return () => {
      parent.removeEventListener('scroll', checkScrollPosition);
      if (interval) clearInterval(interval);
    };
  }, [isResponseLoading, conversationId, scrollContainer]);

  return {
    showScrollButton,
    scrollToMostRecentRound,
  };
};
