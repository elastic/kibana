/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useState } from 'react';
import { css } from '@emotion/react';
import { AGENT_MAIN_CONTAINER_ID, layoutVar } from '@kbn/ui-chrome-layout';

/** Pin flyouts to the agent column so they do not cover the application workspace. */
export const agentPanelFlyoutStyles = css`
  top: ${layoutVar('application.top', '0px')} !important;
  bottom: ${layoutVar('application.bottom', '0px')} !important;
  right: ${layoutVar('agent.right', '0px')} !important;
  height: auto !important;
  max-height: none !important;
`;

const PUSH_OFFSET_PROPS = ['padding-inline-start', 'padding-inline-end'] as const;

let agentPanelPushFlyoutCount = 0;

/** Strip EUI push-flyout padding left on the agent column after close. */
export const clearAgentPanelPushOffset = (): void => {
  const element = document.getElementById(AGENT_MAIN_CONTAINER_ID);
  if (!element) {
    return;
  }

  for (const prop of PUSH_OFFSET_PROPS) {
    element.style.removeProperty(prop);
  }
};

/**
 * Clears stranded push padding when the last agent-column flyout closes.
 * session="never" flyouts skip Kibana's flyout-manager cleanup.
 */
export const useClearAgentPanelPushOffsetOnUnmount = (enabled: boolean): void => {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    agentPanelPushFlyoutCount += 1;
    return () => {
      agentPanelPushFlyoutCount -= 1;
      if (agentPanelPushFlyoutCount === 0) {
        clearAgentPanelPushOffset();
        requestAnimationFrame(() => {
          if (agentPanelPushFlyoutCount === 0) {
            clearAgentPanelPushOffset();
          }
        });
      }
    };
  }, [enabled]);
};

export const useAgentPanelWidth = (enabled: boolean): number => {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!enabled) {
      setWidth(0);
      return;
    }

    const element = document.getElementById(AGENT_MAIN_CONTAINER_ID);
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [enabled]);

  return width;
};
