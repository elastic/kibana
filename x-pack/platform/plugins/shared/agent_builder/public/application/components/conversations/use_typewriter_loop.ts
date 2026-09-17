/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export const TYPEWRITER_TYPE_MS = 42;
export const TYPEWRITER_ERASE_MS = 28;
export const TYPEWRITER_HOLD_MS = 2000;
export const TYPEWRITER_GAP_MS = 400;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', onChange);
    return () => {
      mediaQuery.removeEventListener('change', onChange);
    };
  }, []);

  return prefersReducedMotion;
};

/**
 * Types each message, pauses, then erases it before looping to the next.
 */
export const useTypewriterLoop = ({
  messages,
  enabled,
}: {
  messages: readonly string[];
  enabled: boolean;
}): string => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedText, setDisplayedText] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const [isErasing, setIsErasing] = useState(false);

  const shouldAnimate = enabled && !prefersReducedMotion && messages.length > 0;

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    const currentMessage = messages[messageIndex % messages.length];
    let delayMs: number;
    let next: () => void;

    if (!isErasing) {
      if (displayedText.length < currentMessage.length) {
        delayMs = displayedText.length === 0 ? TYPEWRITER_GAP_MS : TYPEWRITER_TYPE_MS;
        next = () => setDisplayedText(currentMessage.slice(0, displayedText.length + 1));
      } else {
        delayMs = TYPEWRITER_HOLD_MS;
        next = () => setIsErasing(true);
      }
    } else if (displayedText.length > 0) {
      delayMs = TYPEWRITER_ERASE_MS;
      next = () => setDisplayedText(displayedText.slice(0, -1));
    } else {
      delayMs = TYPEWRITER_GAP_MS;
      next = () => {
        const nextIndex = (messageIndex + 1) % messages.length;
        setMessageIndex(nextIndex);
        setIsErasing(false);
        setDisplayedText(messages[nextIndex].slice(0, 1));
      };
    }

    const timeoutId = window.setTimeout(next, delayMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [displayedText, isErasing, messageIndex, messages, shouldAnimate]);

  useEffect(() => {
    if (shouldAnimate) {
      return;
    }

    setDisplayedText('');
    setMessageIndex(0);
    setIsErasing(false);
  }, [shouldAnimate]);

  if (!enabled || messages.length === 0) {
    return '';
  }

  if (prefersReducedMotion) {
    return messages[0];
  }

  return displayedText;
};
