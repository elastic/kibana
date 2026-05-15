/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

const HEADER_ACTIONS_TEST_SUBJ = 'streamsAllStreamsHeaderActions';
const DEMO_TOOLBAR_TEST_SUBJ = 'streamsIngestHubDemoStreamsToolbar';
const NUDGE_ATTR = 'data-streams-date-popover-right-cap-nudge';

function getHeaderActionsRightEdge(): number | undefined {
  const el = document.querySelector(`[data-test-subj="${HEADER_ACTIONS_TEST_SUBJ}"]`);
  return el?.getBoundingClientRect().right;
}

function clearNudge(panel: HTMLElement) {
  if (!panel.hasAttribute(NUDGE_ATTR)) {
    return;
  }
  panel.style.marginLeft = '';
  panel.removeAttribute(NUDGE_ATTR);
}

function nudgePanel(panel: HTMLElement, ceilingRight: number) {
  const rect = panel.getBoundingClientRect();
  const delta = ceilingRight - rect.right;
  if (delta >= -0.5) {
    clearNudge(panel);
    return;
  }
  panel.style.marginLeft = `${delta}px`;
  panel.setAttribute(NUDGE_ATTR, 'true');
}

function nudgeOpenPopoversFromDemoToolbar() {
  const ceiling = getHeaderActionsRightEdge();
  if (ceiling == null) {
    return;
  }

  const toolbar = document.querySelector(`[data-test-subj="${DEMO_TOOLBAR_TEST_SUBJ}"]`);
  if (!toolbar) {
    return;
  }

  document.querySelectorAll(`[${NUDGE_ATTR}]`).forEach((node) => {
    if (!(node instanceof HTMLElement) || !node.id) {
      return;
    }
    const anchor = document.querySelector(
      `[aria-controls="${CSS.escape(node.id)}"][aria-expanded="true"]`
    );
    if (!anchor || !toolbar.contains(anchor)) {
      clearNudge(node);
    }
  });

  toolbar.querySelectorAll('[aria-expanded="true"]').forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const panelId = node.getAttribute('aria-controls');
    if (!panelId) {
      return;
    }
    const panel = document.getElementById(panelId);
    if (!panel || !(panel instanceof HTMLElement)) {
      return;
    }
    if (!panel.hasAttribute('data-popover-panel')) {
      return;
    }
    nudgePanel(panel, ceiling);
  });
}

/**
 * EUI's SuperDatePicker quick menu uses `anchorPosition="downLeft"`, so the popover grows to the
 * right and can cover the "Create classic stream" control in the All streams header. Date popover
 * buttons for the start value also anchor `downLeft`. We cannot change EUI from here, so when a
 * popover is opened from the ingest demo toolbar we shift its panel left so its right edge stays
 * within the header actions cluster (after EUI finishes positioning).
 */
export function useStreamsListHeaderDatePopoversRightCap(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let debounceHandle: number | undefined;

    const schedule = () => {
      if (debounceHandle != null) {
        window.clearTimeout(debounceHandle);
      }
      debounceHandle = window.setTimeout(() => {
        debounceHandle = undefined;
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(nudgeOpenPopoversFromDemoToolbar);
        });
      }, 32);
    };

    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'data-popover-open', 'aria-expanded'],
    });

    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);
    schedule();

    return () => {
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      document.removeEventListener('scroll', schedule, true);
      if (debounceHandle != null) {
        window.clearTimeout(debounceHandle);
      }
      document.querySelectorAll(`[${NUDGE_ATTR}]`).forEach((p) => {
        if (p instanceof HTMLElement) {
          clearNudge(p);
        }
      });
    };
  }, [enabled]);
}
