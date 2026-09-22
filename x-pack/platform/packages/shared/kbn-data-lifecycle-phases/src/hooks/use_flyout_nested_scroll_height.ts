/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

const MIN_NESTED_SCROLL_HEIGHT = 120;

/**
 * Computes a fixed height for a nested scroll region inside `EuiFlyoutBody`.
 *
 * The returned height spans from the top of `listAnchorRef` to the bottom of
 * `flyoutScrollContainerRef` (the `.euiFlyoutBody__overflow` element via
 * `scrollContainerRef`). This keeps the flyout body scrollable while giving the
 * nested list its own scroll container.
 */
export const useFlyoutNestedScrollHeight = (
  flyoutScrollContainerRef: RefObject<HTMLElement | null>,
  listAnchorRef: RefObject<HTMLElement | null>
): number | undefined => {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let flyoutScrollContainer: HTMLElement | null = null;

    const measure = () => {
      const currentFlyoutScrollContainer = flyoutScrollContainerRef.current;
      const listAnchor = listAnchorRef.current;

      if (
        !currentFlyoutScrollContainer ||
        !listAnchor ||
        !currentFlyoutScrollContainer.isConnected ||
        !listAnchor.isConnected
      ) {
        return;
      }

      const flyoutBottom = currentFlyoutScrollContainer.getBoundingClientRect().bottom;
      const anchorTop = listAnchor.getBoundingClientRect().top;
      const next = Math.max(MIN_NESTED_SCROLL_HEIGHT, Math.floor(flyoutBottom - anchorTop));
      setHeight((prev) => (prev === next ? prev : next));
    };

    const attachListeners = () => {
      flyoutScrollContainer = flyoutScrollContainerRef.current;
      const listAnchor = listAnchorRef.current;
      if (!flyoutScrollContainer || !listAnchor) {
        return;
      }

      observer = new ResizeObserver(measure);
      observer.observe(flyoutScrollContainer);
      observer.observe(listAnchor);
      observer.observe(document.documentElement);

      flyoutScrollContainer.addEventListener('scroll', measure, { passive: true });
      window.addEventListener('resize', measure, { passive: true });
    };

    measure();

    const rafId = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      measure();
      attachListeners();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      if (flyoutScrollContainer) {
        flyoutScrollContainer.removeEventListener('scroll', measure);
      }
      window.removeEventListener('resize', measure);
    };
  }, [flyoutScrollContainerRef, listAnchorRef]);

  return height;
};
