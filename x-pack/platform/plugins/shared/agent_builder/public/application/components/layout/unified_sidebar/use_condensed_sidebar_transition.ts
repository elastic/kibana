/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransitionEvent } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';

import { CONDENSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from './unified_sidebar.constants';

export const SIDEBAR_TRANSITION_MS = 250;
export const SIDEBAR_CONTENT_FADE_MS = 120;

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const isMinWidthTransition = (propertyName: string): boolean =>
  propertyName === 'min-width' || propertyName === 'min-inline-size';

export interface CondensedSidebarTransitionState {
  shouldAnimate: boolean;
  sidebarMinWidth: number;
  showCondensedChrome: boolean;
  showExpandedChrome: boolean;
  expandedContentOpacity: number;
  isExpandedContentHidden: boolean;
  sidebarShellStyles: ReturnType<typeof css>;
  expandedContentStyles: ReturnType<typeof css>;
  onSidebarShellTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
}

export const useCondensedSidebarTransition = (
  isCondensed: boolean
): CondensedSidebarTransitionState => {
  const shouldAnimate = !prefersReducedMotion();
  const prevIsCondensedRef = useRef(isCondensed);
  const collapseFallbackTimeoutRef = useRef<number | undefined>(undefined);
  const expandFallbackTimeoutRef = useRef<number | undefined>(undefined);

  const [showCondensedChrome, setShowCondensedChrome] = useState(isCondensed);
  const [showExpandedChrome, setShowExpandedChrome] = useState(!isCondensed);
  const [expandedContentOpacity, setExpandedContentOpacity] = useState(isCondensed ? 0 : 1);
  const [isExpandedContentHidden, setIsExpandedContentHidden] = useState(isCondensed);

  const clearCollapseFallback = useCallback(() => {
    if (collapseFallbackTimeoutRef.current !== undefined) {
      window.clearTimeout(collapseFallbackTimeoutRef.current);
      collapseFallbackTimeoutRef.current = undefined;
    }
  }, []);

  const clearExpandFallback = useCallback(() => {
    if (expandFallbackTimeoutRef.current !== undefined) {
      window.clearTimeout(expandFallbackTimeoutRef.current);
      expandFallbackTimeoutRef.current = undefined;
    }
  }, []);

  const finishCollapse = useCallback(() => {
    clearCollapseFallback();
    setShowCondensedChrome(true);
    setShowExpandedChrome(false);
    setIsExpandedContentHidden(true);
  }, [clearCollapseFallback]);

  const finishExpand = useCallback(() => {
    clearExpandFallback();
    setShowCondensedChrome(false);
    setShowExpandedChrome(true);
    setIsExpandedContentHidden(false);
    requestAnimationFrame(() => {
      setExpandedContentOpacity(1);
    });
  }, [clearExpandFallback]);

  useLayoutEffect(() => {
    const prevIsCondensed = prevIsCondensedRef.current;

    if (prevIsCondensed === isCondensed) {
      return;
    }

    clearCollapseFallback();
    clearExpandFallback();

    if (!shouldAnimate) {
      setShowCondensedChrome(isCondensed);
      setShowExpandedChrome(!isCondensed);
      setExpandedContentOpacity(isCondensed ? 0 : 1);
      setIsExpandedContentHidden(isCondensed);
      prevIsCondensedRef.current = isCondensed;
      return;
    }

    if (isCondensed) {
      setShowCondensedChrome(false);
      setShowExpandedChrome(true);
      setIsExpandedContentHidden(false);
      setExpandedContentOpacity(0);

      collapseFallbackTimeoutRef.current = window.setTimeout(() => {
        finishCollapse();
      }, SIDEBAR_CONTENT_FADE_MS + SIDEBAR_TRANSITION_MS + 50);
    } else {
      setShowCondensedChrome(true);
      setShowExpandedChrome(false);
      setExpandedContentOpacity(0);
      setIsExpandedContentHidden(true);

      expandFallbackTimeoutRef.current = window.setTimeout(() => {
        finishExpand();
      }, SIDEBAR_TRANSITION_MS + SIDEBAR_CONTENT_FADE_MS + 50);
    }

    prevIsCondensedRef.current = isCondensed;
  }, [
    clearCollapseFallback,
    clearExpandFallback,
    finishCollapse,
    finishExpand,
    isCondensed,
    shouldAnimate,
  ]);

  useLayoutEffect(
    () => () => {
      clearCollapseFallback();
      clearExpandFallback();
    },
    [clearCollapseFallback, clearExpandFallback]
  );

  const onSidebarShellTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || !shouldAnimate || !isMinWidthTransition(event.propertyName)) {
        return;
      }

      if (isCondensed) {
        finishCollapse();
        return;
      }

      finishExpand();
    },
    [finishCollapse, finishExpand, isCondensed, shouldAnimate]
  );

  const sidebarMinWidth = isCondensed ? CONDENSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

  const sidebarShellStyles = css`
    transition: min-inline-size ${shouldAnimate ? SIDEBAR_TRANSITION_MS : 0}ms ease-in-out;
    transition-delay: ${shouldAnimate && isCondensed ? SIDEBAR_CONTENT_FADE_MS : 0}ms;
  `;

  const expandedContentStyles = css`
    opacity: ${expandedContentOpacity};
    pointer-events: ${expandedContentOpacity === 0 ? 'none' : 'auto'};
    transition: opacity ${shouldAnimate ? SIDEBAR_CONTENT_FADE_MS : 0}ms ease-in-out;
  `;

  return {
    shouldAnimate,
    sidebarMinWidth,
    showCondensedChrome,
    showExpandedChrome,
    expandedContentOpacity,
    isExpandedContentHidden,
    sidebarShellStyles,
    expandedContentStyles,
    onSidebarShellTransitionEnd,
  };
};
