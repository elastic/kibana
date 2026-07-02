/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef, useState } from 'react';

import { AGENT_PANEL_CART_POPOVER_AT_WIDTH } from './cart_rail.constants';

const getAgentPanelElement = (container: HTMLElement | null): HTMLElement | null =>
  container?.closest('.kbnChromeLayoutAgent') ?? container;

const getAgentPanelWidth = (container: HTMLElement | null): number =>
  getAgentPanelElement(container)?.getBoundingClientRect().width ?? Infinity;

/**
 * Chooses push vs popover for the right-side cart rail based on agent panel width,
 * mirroring {@link useAgentPanelSidebarLayout} for the left sidebar.
 */
export const useCartRailLayout = () => {
  const [isPopoverMode, setIsPopoverMode] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = getAgentPanelElement(containerRef.current);
    if (!element) {
      return;
    }

    const syncMode = () => {
      setIsPopoverMode(
        getAgentPanelWidth(containerRef.current) < AGENT_PANEL_CART_POPOVER_AT_WIDTH
      );
    };

    const resizeObserver = new ResizeObserver(syncMode);
    resizeObserver.observe(element);
    syncMode();

    return () => resizeObserver.disconnect();
  }, []);

  return {
    containerRef,
    isPopoverMode,
  };
};
