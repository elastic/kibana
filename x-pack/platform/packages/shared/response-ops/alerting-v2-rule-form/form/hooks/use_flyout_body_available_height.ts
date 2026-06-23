/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

/**
 * EUI-internal class names — not part of the public API. Verified against
 * `@elastic/eui` 116.2.0. An EUI upgrade may change these selectors; if
 * measurement returns 0 the editor falls back to a CSS clamp height.
 */
const FLYOUT_BODY_OVERFLOW_SELECTOR = '.euiFlyoutBody__overflow';
const FLYOUT_BODY_CONTENT_SELECTOR = '.euiFlyoutBody__overflowContent';
const PANEL_SELECTOR = '.euiPanel';

/** Small inset so the editor border stays inside the flyout body clip region. */
const EDITOR_BOTTOM_BUFFER_PX = 2;

const parsePaddingBottom = (element: Element): number =>
  parseFloat(getComputedStyle(element).paddingBottom) || 0;

/**
 * Measures the available vertical space inside the surrounding `EuiFlyoutBody`
 * for the element pointed at by `ref`, in pixels.
 *
 * The returned height fills the area from the top of `ref.current` down to the
 * bottom of `.euiFlyoutBody__overflow` (the scroll/clip container), minus a
 * small inset for borders and sub-pixel rounding.
 *
 * Re-measures on resize via `ResizeObserver`. Returns `0` until the element is
 * mounted inside an `EuiFlyoutBody`, or when `enabled` is false.
 */
export const useFlyoutBodyAvailableHeight = (
  ref: RefObject<HTMLElement | null>,
  enabled = true
): number => {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!enabled) {
      setHeight(0);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const flyoutOverflow = el.closest(FLYOUT_BODY_OVERFLOW_SELECTOR);
    if (!flyoutOverflow) return;

    const overflowContent =
      el.closest(FLYOUT_BODY_CONTENT_SELECTOR) ??
      flyoutOverflow.querySelector(FLYOUT_BODY_CONTENT_SELECTOR);

    const measure = () => {
      if (!el.isConnected) return;

      let bottom = flyoutOverflow.getBoundingClientRect().bottom;
      if (!overflowContent) {
        const panel = el.closest(PANEL_SELECTOR);
        if (panel) {
          bottom -= parsePaddingBottom(panel);
        }
      }

      const wrapperTop = el.getBoundingClientRect().top;
      const next = Math.max(0, Math.floor(bottom - wrapperTop - EDITOR_BOTTOM_BUFFER_PX));
      setHeight((prev) => (prev === next ? prev : next));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(flyoutOverflow);
    observer.observe(el);
    if (overflowContent) {
      observer.observe(overflowContent);
    }

    return () => observer.disconnect();
  }, [enabled, ref]);

  return height;
};
