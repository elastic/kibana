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
  conversationId,
  scrollContainer,
}: {
  conversationId: string;
  scrollContainer: HTMLDivElement | null;
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Set up scroll listener to show/hide scroll button
  useEffect(() => {
    const parent = scrollContainer?.parentElement;
    if (!parent) return;

    const handleScroll = () => {
      const { scrollTop } = parent;
      // With column-reverse, {scrollTop} is negative when scrolled up
      const distanceFromBottom = Math.abs(scrollTop);
      const threshold = 200;

      setShowScrollButton(distanceFromBottom > threshold);
    };

    parent.addEventListener('scroll', handleScroll);
    return () => parent.removeEventListener('scroll', handleScroll);
  }, [conversationId, scrollContainer]);

  return {
    showScrollButton,
    scrollToMostRecentRound,
  };
};
