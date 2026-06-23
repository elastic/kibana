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
  const smoothScrollingRef = useRef(false);
  const pendingSmoothScrollRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const setAtBottom = useCallback(() => {
    stuckToBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  const stickToBottom = useCallback(() => {
    if (!scrollContainer) return;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    setAtBottom();
  }, [scrollContainer, setAtBottom]);

  const doSmoothScroll = useCallback(() => {
    if (!scrollContainer) return;
    smoothScrollingRef.current = true;
    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    scrollContainer.addEventListener(
      'scrollend',
      () => {
        smoothScrollingRef.current = false;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        setAtBottom();
      },
      { once: true }
    );
  }, [scrollContainer, setAtBottom]);

  useEffect(() => {
    smoothScrollingRef.current = false;
    pendingSmoothScrollRef.current = false;
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer) return;
    const onScroll = () => {
      if (smoothScrollingRef.current) return;
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
      if (!stuckToBottomRef.current) return;
      if (smoothScrollingRef.current) {
        pendingSmoothScrollRef.current = false;
        return;
      }
      if (pendingSmoothScrollRef.current) {
        pendingSmoothScrollRef.current = false;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        if (scrollHeight - scrollTop - clientHeight <= AT_BOTTOM_THRESHOLD) {
          return;
        }
        doSmoothScroll();
      } else {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    const inner = scrollContainer.firstElementChild;
    if (inner) observer.observe(inner);
    return () => observer.disconnect();
  }, [scrollContainer, doSmoothScroll]);

  useEffect(() => {
    if (!scrollContainer || !conversationId) return;
    stickToBottom();
  }, [conversationId, scrollContainer, stickToBottom]);

  const smoothScrollToBottom = useCallback(() => {
    if (!scrollContainer) return;
    if (smoothScrollingRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    if (scrollHeight - scrollTop - clientHeight <= AT_BOTTOM_THRESHOLD) {
      setAtBottom();
      return;
    }
    setShowScrollButton(false);
    doSmoothScroll();
  }, [scrollContainer, setAtBottom, doSmoothScroll]);

  const onMessageSent = useCallback(() => {
    if (!scrollContainer) return;
    stuckToBottomRef.current = true;
    pendingSmoothScrollRef.current = true;
    setShowScrollButton(false);
  }, [scrollContainer]);

  return {
    showScrollButton,
    onMessageSent,
    smoothScrollToBottom,
    stickToBottom,
  };
};
