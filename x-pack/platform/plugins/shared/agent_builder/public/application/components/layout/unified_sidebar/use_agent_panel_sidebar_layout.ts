/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { AGENT_PANEL_SIDEBAR_COLLAPSE_AT_WIDTH } from './unified_sidebar.constants';

const getAgentPanelElement = (container: HTMLElement | null): HTMLElement | null =>
  container?.closest('.kbnChromeLayoutAgent') ?? container;

const getAgentPanelWidth = (container: HTMLElement | null): number =>
  getAgentPanelElement(container)?.getBoundingClientRect().width ?? Infinity;

/**
 * Manages push vs popover sidebar mode, auto-collapsing to popover when
 * `.kbnChromeLayoutAgent` is narrower than {@link AGENT_PANEL_SIDEBAR_COLLAPSE_AT_WIDTH}.
 */
export const useAgentPanelSidebarLayout = () => {
  const [isCondensed, setIsCondensed] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = getAgentPanelElement(containerRef.current);
    if (!element) {
      return;
    }

    const collapseIfNeeded = () => {
      if (getAgentPanelWidth(containerRef.current) < AGENT_PANEL_SIDEBAR_COLLAPSE_AT_WIDTH) {
        setIsCondensed(true);
      }
    };

    const resizeObserver = new ResizeObserver(collapseIfNeeded);
    resizeObserver.observe(element);
    collapseIfNeeded();

    return () => resizeObserver.disconnect();
  }, []);

  const onToggleCondensed = useCallback(() => {
    setIsCondensed((isCurrentlyCondensed) => {
      if (!isCurrentlyCondensed) {
        return true;
      }

      return getAgentPanelWidth(containerRef.current) >= AGENT_PANEL_SIDEBAR_COLLAPSE_AT_WIDTH
        ? false
        : true;
    });
  }, []);

  return {
    containerRef,
    isCondensed,
    onToggleCondensed,
  };
};
