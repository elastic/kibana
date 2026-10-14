/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const AT_BOTTOM_THRESHOLD = 50;
const SMOOTH_SCROLL_TIMEOUT_MS = 2000;

const isAtBottom = (el: HTMLElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= AT_BOTTOM_THRESHOLD;

export const useConversationScrollActions = ({
  scrollContainer,
  scrollContainerHeight,
  timelineContent,
  anchoredItemKey,
}: {
  scrollContainer: HTMLDivElement | null;
  scrollContainerHeight: number;
  timelineContent: HTMLDivElement | null;
  anchoredItemKey?: string;
}) => {
  const stuckToBottomRef = useRef(true);
  const smoothScrollingRef = useRef(false);
  const pendingSmoothScrollRef = useRef(false);
  const smoothScrollFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollGenRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const cancelSmoothScroll = useCallback(() => {
    scrollGenRef.current++;
    if (smoothScrollFallbackTimerRef.current !== null) {
      clearTimeout(smoothScrollFallbackTimerRef.current);
      smoothScrollFallbackTimerRef.current = null;
    }
    smoothScrollingRef.current = false;
  }, []);

  const stickToBottom = useCallback(() => {
    if (!scrollContainer) return;
    cancelSmoothScroll();
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    stuckToBottomRef.current = true;
    setShowScrollButton(false);
  }, [scrollContainer, cancelSmoothScroll]);

  // Whether a timeline item extends below the visible area. Unlike `isAtBottom`, this ignores the
  // space reserved under the anchored item, which is not content to scroll to.
  const hasContentBelow = useCallback(() => {
    if (!scrollContainer) return false;
    const items = timelineContent?.querySelectorAll<HTMLElement>('[data-timeline-item-key]');
    const lastItem = items?.[items.length - 1];
    if (!lastItem) return !isAtBottom(scrollContainer);
    return (
      lastItem.getBoundingClientRect().bottom - scrollContainer.getBoundingClientRect().bottom >
      AT_BOTTOM_THRESHOLD
    );
  }, [scrollContainer, timelineContent]);

  const doSmoothScroll = useCallback(() => {
    if (!scrollContainer) return;

    if (smoothScrollFallbackTimerRef.current !== null) {
      clearTimeout(smoothScrollFallbackTimerRef.current);
    }

    smoothScrollingRef.current = true;
    const gen = ++scrollGenRef.current;
    const scrollTarget = scrollContainer.scrollHeight - scrollContainer.clientHeight;

    const onComplete = () => {
      smoothScrollingRef.current = false;
      const reachedTarget =
        Math.abs(scrollContainer.scrollTop - scrollTarget) <= AT_BOTTOM_THRESHOLD;
      if (isAtBottom(scrollContainer) || reachedTarget) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        stuckToBottomRef.current = true;
        setShowScrollButton(false);
      } else {
        stuckToBottomRef.current = false;
        setShowScrollButton(hasContentBelow());
      }
    };

    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });

    scrollContainer.addEventListener(
      'scrollend',
      () => {
        if (gen !== scrollGenRef.current) return;
        if (smoothScrollFallbackTimerRef.current !== null) {
          clearTimeout(smoothScrollFallbackTimerRef.current);
          smoothScrollFallbackTimerRef.current = null;
        }
        onComplete();
      },
      { once: true }
    );

    smoothScrollFallbackTimerRef.current = setTimeout(() => {
      smoothScrollFallbackTimerRef.current = null;
      if (gen !== scrollGenRef.current) return;
      onComplete();
    }, SMOOTH_SCROLL_TIMEOUT_MS);
  }, [scrollContainer, hasContentBelow]);

  // The timeline is kept at least one viewport tall from the anchored item down, so "scrolled to
  // the bottom" puts that item at the top of the container. The answer fills the reserved space
  // without changing the timeline's size; once it outgrows it, the view follows as usual. The
  // reserve sits on an inner wrapper, not on the observed content item: an explicit min-height
  // would replace that item's automatic minimum size and it would stop growing with the answer.
  const reserveAnchorSpace = useCallback(() => {
    if (!scrollContainer || !timelineContent) return;
    const anchored = anchoredItemKey
      ? timelineContent.querySelector<HTMLElement>(`[data-timeline-item-key="${anchoredItemKey}"]`)
      : null;
    if (!anchored) {
      timelineContent.style.minHeight = '';
      return;
    }
    const anchoredTop =
      anchored.getBoundingClientRect().top - timelineContent.getBoundingClientRect().top;
    timelineContent.style.minHeight = `${Math.ceil(anchoredTop + scrollContainer.clientHeight)}px`;
  }, [scrollContainer, timelineContent, anchoredItemKey]);

  useLayoutEffect(() => {
    reserveAnchorSpace();
  }, [reserveAnchorSpace, scrollContainerHeight]);

  useEffect(() => {
    cancelSmoothScroll();
    pendingSmoothScrollRef.current = false;
    stuckToBottomRef.current = true;
    if (!scrollContainer) return;
    const onScroll = () => {
      if (smoothScrollingRef.current) return;
      stuckToBottomRef.current = isAtBottom(scrollContainer);
      setShowScrollButton(hasContentBelow());
    };
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, [scrollContainer, cancelSmoothScroll, hasContentBelow]);

  useEffect(() => {
    if (!scrollContainer) return;
    const observer = new ResizeObserver(() => {
      if (!stuckToBottomRef.current) {
        setShowScrollButton(hasContentBelow());
        return;
      }
      if (smoothScrollingRef.current) {
        pendingSmoothScrollRef.current = false;
        return;
      }
      if (pendingSmoothScrollRef.current) {
        pendingSmoothScrollRef.current = false;
        if (!isAtBottom(scrollContainer)) {
          doSmoothScroll();
        }
      } else {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    const inner = scrollContainer.firstElementChild;
    if (inner) observer.observe(inner);
    return () => observer.disconnect();
  }, [scrollContainer, doSmoothScroll, hasContentBelow]);

  const smoothScrollToBottom = useCallback(() => {
    if (!scrollContainer) return;
    if (smoothScrollingRef.current) return;
    if (isAtBottom(scrollContainer)) {
      stuckToBottomRef.current = true;
      setShowScrollButton(false);
      return;
    }
    setShowScrollButton(false);
    doSmoothScroll();
  }, [scrollContainer, doSmoothScroll]);

  // Releases the view from the bottom even while pinned there, so the ResizeObserver leaves it
  // alone as content grows, and offers the scroll button instead.
  const stopFollowingBottom = useCallback(() => {
    cancelSmoothScroll();
    pendingSmoothScrollRef.current = false;
    stuckToBottomRef.current = false;
    setShowScrollButton(hasContentBelow());
  }, [cancelSmoothScroll, hasContentBelow]);

  const onMessageSent = useCallback(() => {
    if (!scrollContainer) return;
    stuckToBottomRef.current = true;
    pendingSmoothScrollRef.current = true;
    setShowScrollButton(false);
  }, [scrollContainer]);

  return {
    showScrollButton,
    onMessageSent,
    stopFollowingBottom,
    smoothScrollToBottom,
    stickToBottom,
  };
};
