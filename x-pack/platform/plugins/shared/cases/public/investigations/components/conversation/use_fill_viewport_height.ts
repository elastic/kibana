/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * The page of the Investigations app is as tall as its content, so a chat that is `height: 100%`
 * would grow with its messages. This gives the element the space between its top edge and the
 * bottom of the window, which keeps the chat's own message list scrolling.
 */
export const useFillViewportHeight = (
  minHeight: number,
  bottomGap: number
): { ref: React.RefCallback<HTMLElement>; height: number } => {
  const elementRef = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState(minHeight);

  const measure = useCallback(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    let top = element.getBoundingClientRect().top;
    // Scrolled ancestors move the element up; measure from where it sits without any scroll.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      top += parent.scrollTop;
    }
    setHeight(Math.max(minHeight, Math.floor(window.innerHeight - top - bottomGap)));
  }, [minHeight, bottomGap]);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      if (element) {
        measure();
      }
    },
    [measure]
  );

  useLayoutEffect(() => {
    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { ref, height };
};
