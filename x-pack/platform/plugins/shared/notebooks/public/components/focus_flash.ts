/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FOCUS_FADE_DURATION_MS = 1500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const IN_VIEW_THRESHOLDS = [0.25, 0.5, 0.75, 1];

/**
 * Calls `onInView` once the element shows at least half of itself, or fills half the viewport
 * when it is taller than that; returns a function that stops waiting.
 */
const whenInView = (element: Element, onInView: () => void): (() => void) => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      const isInView =
        entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= window.innerHeight / 2;
      if (!isInView) return;
      observer.disconnect();
      onInView();
    },
    { threshold: IN_VIEW_THRESHOLDS }
  );
  observer.observe(element);
  return () => observer.disconnect();
};

/**
 * Fades a glow out around the element once it scrolls into view; `getShadows` is read then, so
 * it reflects the latest theme. Returns a function that stops waiting.
 */
export const flashWhenInView = (
  element: HTMLElement,
  getShadows: () => { border?: string; glow: string }
): (() => void) => {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return () => {};
  return whenInView(element, () => {
    const { border, glow } = getShadows();
    const withBorder = (shadow: string) => (border ? `${border}, ${shadow}` : shadow);
    element.animate(
      [
        { boxShadow: withBorder(`0 0 16px 4px ${glow}`) },
        { boxShadow: withBorder('0 0 16px 4px transparent') },
      ],
      { duration: FOCUS_FADE_DURATION_MS, easing: 'ease-out' }
    );
  });
};
