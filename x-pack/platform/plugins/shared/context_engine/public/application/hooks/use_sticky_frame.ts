/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export interface StickyFrame {
  /** Offset from the top of the scroll container at which the element sticks. */
  top: number;
  /** Height that keeps the stuck element inside the scroll container's viewport. */
  height: number;
  /** Space between the element's right edge and the scroll container's visible right edge. */
  rightGap: number;
  /** The element's own width. */
  width: number;
}

const scrollParentOf = (element: HTMLElement): HTMLElement | undefined => {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = window.getComputedStyle(parent);
    if (/(auto|scroll)/.test(overflowY)) {
      return parent;
    }
  }
  return undefined;
};

/**
 * Where an element sticks so it stays below everything above it when the page first renders
 * (such as a sticky app header), how tall it can be there, and how far it could extend to the
 * right. Kibana scrolls the application in its own container, under headers whose height is not
 * exposed.
 */
export const useStickyFrame = (
  element: HTMLElement | null,
  { minHeight, bottomGap }: { minHeight: number; bottomGap: number }
): StickyFrame | undefined => {
  const [frame, setFrame] = useState<StickyFrame>();

  useEffect(() => {
    if (!element) {
      return;
    }
    const scrollParent = scrollParentOf(element);
    const viewport = scrollParent ?? window.document.documentElement;
    const measure = () => {
      const containerTop = scrollParent ? scrollParent.getBoundingClientRect().top : 0;
      const top = Math.max(
        0,
        element.getBoundingClientRect().top - containerTop + (scrollParent?.scrollTop ?? 0)
      );
      const bounds = element.getBoundingClientRect();
      const viewportRight =
        (scrollParent ? scrollParent.getBoundingClientRect().left + scrollParent.clientLeft : 0) +
        viewport.clientWidth;
      setFrame({
        top,
        height: Math.max(minHeight, viewport.clientHeight - top - bottomGap),
        rightGap: Math.max(0, viewportRight - bounds.right),
        width: bounds.width,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, minHeight, bottomGap]);

  return frame;
};
