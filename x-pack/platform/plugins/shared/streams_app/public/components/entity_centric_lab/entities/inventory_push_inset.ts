/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lab "push" presentation: EUI `type="push"` fights Kibana's `#app-main-scroll`
 * container and managed flyout sessions. Instead, inset the inventory chrome +
 * grid by the pixel width of open entity flyouts (measured from the app area).
 */

import { useEffect, useState } from 'react';
import { css, type SerializedStyles } from '@emotion/react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

/** Markers on lab flyouts — measure the nearest `.euiFlyout` panel, not inner wrappers. */
export const ENTITY_LAB_FLYOUT_MARKERS = [
  '[data-test-subj="entityCentricLabFlyout"]',
  '[data-test-subj="entityCentricLabFlyoutDashboardPreview"]',
  '[data-test-subj="entityCentricLabLogDocumentFlyout"]',
  '[data-test-subj="entityDetailPageDashboardPreview"]',
  '[data-test-subj="entityCentricLabInventoryDashboardPreview"]',
].join(', ');

const PUSH_OFFSET_CSS_VAR = '--euiPushFlyoutOffsetInlineEnd';

const clearAppMainScrollPushOffset = (): void => {
  document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID)?.style.removeProperty(PUSH_OFFSET_CSS_VAR);
};

const flyoutPanelForMarker = (marker: Element): Element => {
  return marker.closest('.euiFlyout') ?? marker;
};

/**
 * EUI flyout named size `l` — at this width (or wider), shrinking the inventory
 * page via push inset looks broken, so we fall back to overlay (no inset).
 */
export const INVENTORY_PUSH_OVERLAY_FALLBACK_WIDTH_PX = 768;

const isFlyoutPanelVisibleInScroll = (rect: DOMRect, scrollRect: DOMRect): boolean => {
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  if (rect.bottom <= scrollRect.top || rect.top >= scrollRect.bottom) {
    return false;
  }
  if (rect.right <= scrollRect.left || rect.left >= scrollRect.right) {
    return false;
  }
  return true;
};

export const measureInventoryPushInsetPx = (): number => {
  const scrollEl = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
  if (!scrollEl) {
    return 0;
  }
  const scrollRect = scrollEl.getBoundingClientRect();
  let minFlyoutLeftForInset = scrollRect.right;
  let minFlyoutLeftOverall = scrollRect.right;
  let maxPanelWidth = 0;

  for (const marker of document.querySelectorAll(ENTITY_LAB_FLYOUT_MARKERS)) {
    const panel = flyoutPanelForMarker(marker);
    const rect = panel.getBoundingClientRect();
    if (!isFlyoutPanelVisibleInScroll(rect, scrollRect)) {
      continue;
    }

    maxPanelWidth = Math.max(maxPanelWidth, rect.width);
    minFlyoutLeftOverall = Math.min(minFlyoutLeftOverall, rect.left);

    if (marker.hasAttribute('data-entity-lab-flyout-exclude-push-inset')) {
      continue;
    }
    minFlyoutLeftForInset = Math.min(minFlyoutLeftForInset, rect.left);
  }

  if (minFlyoutLeftOverall >= scrollRect.right) {
    return 0;
  }

  const totalFlyoutSpanPx = scrollRect.right - minFlyoutLeftOverall;
  if (
    maxPanelWidth >= INVENTORY_PUSH_OVERLAY_FALLBACK_WIDTH_PX ||
    totalFlyoutSpanPx >= INVENTORY_PUSH_OVERLAY_FALLBACK_WIDTH_PX
  ) {
    return 0;
  }

  if (minFlyoutLeftForInset >= scrollRect.right) {
    return 0;
  }

  const inset = scrollRect.right - minFlyoutLeftForInset;
  return Math.max(0, Math.round(Math.min(inset, scrollRect.width)));
};

/** While `enabled`, tracks how far to pad the inventory page from the inline end. */
export const useInventoryPushInsetPx = (enabled: boolean): number => {
  const [insetPx, setInsetPx] = useState(0);

  useEffect(() => {
    clearAppMainScrollPushOffset();

    if (!enabled) {
      setInsetPx(0);
      return;
    }

    let rafId = 0;
    let lastInset = -1;

    const tick = () => {
      const nextInset = measureInventoryPushInsetPx();
      if (nextInset !== lastInset) {
        lastInset = nextInset;
        setInsetPx(nextInset);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(rafId);
      setInsetPx(0);
      clearAppMainScrollPushOffset();
    };
  }, [enabled]);

  return insetPx;
};

/** Flex shell around inventory header + body so push inset shrinks list/hex, not just the page header. */
export const getInventoryPushShellCss = (
  active: boolean,
  insetPx: number
): SerializedStyles | undefined => {
  if (!active) {
    return undefined;
  }
  return css`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: clip;
    padding-inline-end: ${insetPx}px;
    transition: padding-inline-end 150ms ease;
  `;
};

export const inventoryPushFlexItemCss = css`
  min-width: 0;
  max-width: 100%;
`;

/** Body section must clip horizontal overflow or hex rows keep the pre-push width. */
export const inventoryPushBodyCss = css`
  min-width: 0 !important;
  max-width: 100% !important;
  overflow-x: clip !important;

  & > div {
    min-width: 0;
    max-width: 100%;
  }
`;
