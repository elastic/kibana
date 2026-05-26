/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import React from 'react';

import { getNightshiftIconDataUrl } from '../../../common';

/**
 * Brand-specified colors for the Nightshift solution-view home button in
 * the side nav. Hard-coded (not derived from EUI tokens) so the look stays
 * consistent regardless of theme.
 *
 *   unselected
 *     - background: none (transparent)
 *     - moon icon:  99° gradient #D9E8FF → #ECE2FE (very pale blue/lavender)
 *     - on :hover:  white @ 15% opacity overlay, icon unchanged
 *   selected (nav-item-isActive)
 *     - background: 131° gradient #0B64DD → #8144CC (deep blue/purple)
 *     - moon icon:  solid #FFFFFF (white)
 */
const UNSELECTED_BG = 'none';
const UNSELECTED_HOVER_BG = 'rgba(255, 255, 255, 0.15)';
const SELECTED_BG = 'linear-gradient(131deg, #0B64DD 2.98%, #8144CC 66.24%)';
const UNSELECTED_ICON_START = '#D9E8FF';
const UNSELECTED_ICON_END = '#ECE2FE';
const SELECTED_ICON_FILL = '#FFFFFF';

/**
 * Selector for the Nightshift solution view's "home" anchor in the
 * project-style side nav. Matches both selected and unselected states.
 *
 * Mirrors the data-test-subj scheme set by
 * `src/core/packages/chrome/browser-components/src/project/sidenav/navigation/to_navigation_items.tsx`:
 *   nav-item, nav-item-<deepLinkId>, nav-item-deepLinkId-<deepLinkId>,
 *   nav-item-id-<id>, [nav-item-isActive], nav-item-home
 */
const HOME_BUTTON_SELECTOR =
  'a[data-test-subj~="nav-item-home"][data-test-subj*="nightshift"]';

const ICON_WRAPPER_CLASS = 'kbnChromeNav-iconWrapper';
const NIGHTSHIFT_STYLED_ATTR = 'data-nightshift-styled';
// Track the icon's original `src` so we can restore it if the rule needs to
// be removed (e.g. on component unmount).
const NIGHTSHIFT_ORIGINAL_SRC_ATTR = 'data-nightshift-original-src';

interface NightshiftStyles {
  unselectedBg: string;
  unselectedHoverBg: string;
  selectedBg: string;
  unselectedIconUrl: string;
  selectedIconUrl: string;
}

function isActive(button: HTMLAnchorElement): boolean {
  // data-test-subj is a space-separated token list; presence of
  // `nav-item-isActive` means the side nav considers this item selected.
  const tokens = button.getAttribute('data-test-subj') ?? '';
  return tokens.split(/\s+/).includes('nav-item-isActive');
}

/**
 * Paint the icon wrapper with either a gradient image (`linear-gradient`),
 * a solid rgba/hex color, or no background at all (`none`). Lets us swap
 * between the three forms cleanly without leaving the previous slot
 * lingering (e.g. an old `background-image` showing through after we set
 * `background-color`).
 */
function paintBackground(wrapper: HTMLElement, value: string) {
  if (value.startsWith('linear-gradient')) {
    wrapper.style.backgroundColor = 'transparent';
    wrapper.style.backgroundImage = value;
  } else if (value === 'none') {
    wrapper.style.backgroundColor = 'transparent';
    wrapper.style.backgroundImage = 'none';
  } else {
    wrapper.style.backgroundColor = value;
    wrapper.style.backgroundImage = 'none';
  }
}

/**
 * Apply (or refresh) the brand-colored background + icon swap on every
 * Nightshift home button currently in the DOM. Picks the unselected vs
 * selected color set based on the `nav-item-isActive` token. Idempotent —
 * re-running with the same styles is a no-op except for refreshing values.
 *
 * The hover overlay (used only for the unselected state) is set up by
 * `attachHoverHandlers` separately; this function only sets the "resting"
 * background.
 */
function applyNightshiftStyles(styles: NightshiftStyles) {
  const buttons = document.querySelectorAll<HTMLAnchorElement>(HOME_BUTTON_SELECTOR);
  buttons.forEach((button) => {
    const active = isActive(button);
    const bg = active ? styles.selectedBg : styles.unselectedBg;
    const iconUrl = active ? styles.selectedIconUrl : styles.unselectedIconUrl;

    const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
    if (wrapper) {
      // Inline styles win over Emotion-generated classed rules without
      // needing `!important`.
      paintBackground(wrapper, bg);
      // Cache the resting + hover backgrounds for use by the
      // pointerover/pointerout handlers in the React component.
      wrapper.dataset.nightshiftRestBg = bg;
      wrapper.dataset.nightshiftHoverBg = active ? bg : styles.unselectedHoverBg;
    }
    const icon = button.querySelector<HTMLImageElement>(`.${ICON_WRAPPER_CLASS} img`);
    if (icon) {
      if (!icon.hasAttribute(NIGHTSHIFT_ORIGINAL_SRC_ATTR)) {
        icon.setAttribute(NIGHTSHIFT_ORIGINAL_SRC_ATTR, icon.src);
      }
      if (icon.src !== iconUrl) {
        icon.src = iconUrl;
      }
    }
    button.setAttribute(NIGHTSHIFT_STYLED_ATTR, 'true');
  });
}

/**
 * Restore every Nightshift home button to its default look. Called on
 * unmount and when the active theme changes (the next apply runs with the
 * fresh values).
 */
function restoreDefaults() {
  const buttons = document.querySelectorAll<HTMLAnchorElement>(
    `[${NIGHTSHIFT_STYLED_ATTR}="true"]`
  );
  buttons.forEach((button) => {
    const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
    if (wrapper) {
      wrapper.style.removeProperty('background-color');
      wrapper.style.removeProperty('background-image');
      delete wrapper.dataset.nightshiftBase;
      delete wrapper.dataset.nightshiftHover;
    }
    const icon = button.querySelector<HTMLImageElement>(`.${ICON_WRAPPER_CLASS} img`);
    if (icon) {
      const original = icon.getAttribute(NIGHTSHIFT_ORIGINAL_SRC_ATTR);
      if (original) {
        icon.src = original;
        icon.removeAttribute(NIGHTSHIFT_ORIGINAL_SRC_ATTR);
      }
    }
    button.removeAttribute(NIGHTSHIFT_STYLED_ATTR);
  });
}

/**
 * Apply brand-colored backgrounds + moon icons to the Nightshift solution
 * view's home button in the project side nav. Two distinct states:
 *
 *   unselected  → pale background + saturated gradient moon
 *   selected    → deep background + solid white moon
 *
 * Implementation note: we use direct DOM mutation (inline styles + `src`
 * swap) rather than a CSS rule. Plain CSS approaches were not reliably
 * winning specificity against the MenuItem's own Emotion styles for the
 * `.kbnChromeNav-iconWrapper` class. Inline styles always win, and we
 * watch the DOM with a MutationObserver to re-apply after each re-render.
 */
export const NightshiftSidenavGlobalStyles: React.FC = () => {
  const styles: NightshiftStyles = useMemo(
    () => ({
      unselectedBg: UNSELECTED_BG,
      unselectedHoverBg: UNSELECTED_HOVER_BG,
      selectedBg: SELECTED_BG,
      unselectedIconUrl: getNightshiftIconDataUrl({
        size: 16,
        startColor: UNSELECTED_ICON_START,
        endColor: UNSELECTED_ICON_END,
      }),
      selectedIconUrl: getNightshiftIconDataUrl({
        size: 16,
        solidColor: SELECTED_ICON_FILL,
      }),
    }),
    []
  );

  useEffect(() => {
    // Initial apply.
    applyNightshiftStyles(styles);

    // Re-apply whenever the side-nav DOM mutates. React re-renders the
    // nav tree on every navigation; without an observer our inline styles
    // get wiped (and the selected ↔ unselected state can change without a
    // remount, so we have to watch data-test-subj attribute changes too).
    const observer = new MutationObserver(() => {
      applyNightshiftStyles(styles);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-test-subj', 'class'],
    });

    // Hover affordance: on pointerover, paint the cached hover background
    // (white@15% for unselected, the same gradient for selected — so
    // selected is a no-op on hover). On pointerout, restore the resting
    // background. Each cached value is either `none`, a `linear-gradient`,
    // or an `rgba(...)` solid; `paintBackground` handles all three.
    const handlePointerOver = (event: Event) => {
      const target = (event.target as Element).closest(HOME_BUTTON_SELECTOR);
      if (!target) return;
      const wrapper = target.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
      const hover = wrapper?.dataset.nightshiftHoverBg;
      if (wrapper && hover) paintBackground(wrapper, hover);
    };
    const handlePointerOut = (event: Event) => {
      const target = (event.target as Element).closest(HOME_BUTTON_SELECTOR);
      if (!target) return;
      const wrapper = target.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
      const rest = wrapper?.dataset.nightshiftRestBg;
      if (wrapper && rest) paintBackground(wrapper, rest);
    };
    document.body.addEventListener('pointerover', handlePointerOver);
    document.body.addEventListener('pointerout', handlePointerOut);

    return () => {
      observer.disconnect();
      document.body.removeEventListener('pointerover', handlePointerOver);
      document.body.removeEventListener('pointerout', handlePointerOut);
      restoreDefaults();
    };
  }, [styles]);

  return null;
};
