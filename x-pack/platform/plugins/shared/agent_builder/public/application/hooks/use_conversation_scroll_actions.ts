/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const AT_BOTTOM_THRESHOLD = 50;

export const useConversationScrollActions = ({
  conversationId,
  scrollContainer,
}: {
  conversationId: string;
  scrollContainer: HTMLDivElement | null;
}) => {
  const stuckToBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const setAtBottom = useCallback(() => {
    stuckToBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (!scrollContainer) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const atBottom = scrollHeight - scrollTop - clientHeight <= AT_BOTTOM_THRESHOLD;
      stuckToBottomRef.current = atBottom;
      setShowScrollButton(!atBottom);
    };
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer) return;
    const observer = new ResizeObserver(() => {
      if (stuckToBottomRef.current) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    const inner = scrollContainer.firstElementChild;
    if (inner) observer.observe(inner);
    return () => observer.disconnect();
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer || !conversationId) return;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    setAtBottom();
  }, [conversationId, scrollContainer, setAtBottom]);

  // Instant jump — called programmatically, e.g. after an existing conversation loads.
  const stickToBottom = useCallback(() => {
    if (!scrollContainer) return;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    setAtBottom();
  }, [scrollContainer, setAtBottom]);

  const smoothScrollToBottom = useCallback(() => {
    if (!scrollContainer) return;
    setShowScrollButton(false);
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    scrollContainer.addEventListener('scrollend', setAtBottom, { once: true });
  }, [scrollContainer, setAtBottom]);

  const onMessageSent = useCallback(() => {
    setAtBottom();
  }, [setAtBottom]);

  return {
    showScrollButton,
    onMessageSent,
    smoothScrollToBottom,
    stickToBottom,
  };
};
