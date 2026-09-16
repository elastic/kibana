/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Attach the returned callback ref to a sentinel element placed at the bottom
 * of a scrollable list. When the sentinel enters the viewport, `fetchNextPage`
 * is called — but only when `hasNextPage` is true and a fetch is not already
 * in flight.
 *
 * A **callback ref** is used instead of `useRef` so that the IntersectionObserver
 * is created (and re-created) whenever the sentinel element mounts or unmounts.
 * A plain `useRef` with an empty effect dependency array would miss the sentinel
 * entirely if the component initially renders in a loading state where the sentinel
 * is not yet in the DOM.
 *
 * The observer reads `hasNextPage`, `isFetchingNextPage`, and `fetchNextPage`
 * through refs so that state changes do NOT recreate the observer.
 *
 * @param rootMargin - pre-fetch distance before the sentinel reaches the viewport
 *   edge. Defaults to '200px' for a smooth, lag-free experience.
 */
export const useInfiniteScroll = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
  scrollContainerRef,
}: {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  rootMargin?: string;
  scrollContainerRef?: React.RefObject<Element | null>;
}): React.RefCallback<HTMLDivElement> => {
  // Track the sentinel element as state so that changes (mount / unmount) cause
  // the observer effect below to re-run.
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);

  // Keep mutable refs in sync with the latest prop values. Mutating refs in the
  // render body is safe here because the observer callback is always asynchronous
  // (post-paint), so by the time it fires the refs hold the current values.
  const hasNextPageRef = useRef(hasNextPage);
  const isFetchingRef = useRef(isFetchingNextPage);
  const fetchRef = useRef(fetchNextPage);
  hasNextPageRef.current = hasNextPage;
  isFetchingRef.current = isFetchingNextPage;
  fetchRef.current = fetchNextPage;

  // Stable callback ref: React calls this with the DOM node when the sentinel
  // mounts and with null when it unmounts.
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelEl(node);
  }, []);

  useEffect(() => {
    if (!sentinelEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPageRef.current && !isFetchingRef.current) {
          fetchRef.current?.();
        }
      },
      { root: scrollContainerRef?.current ?? null, rootMargin, threshold: 0 }
    );

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [sentinelEl, rootMargin, scrollContainerRef]); // re-runs when the sentinel, margin, or container changes

  return sentinelRef;
};
