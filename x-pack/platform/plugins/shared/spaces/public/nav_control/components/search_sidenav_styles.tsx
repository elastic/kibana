/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import React from 'react';

/* ----------------------------------------------------------------------- *
 * Search (VectorDB) side-nav home: brand colours + inline SVG.
 *
 * Mirrors `NightshiftSidenavGlobalStyles` so the Search-solution home
 * button gets the same AI gradient treatment (blue → purple) that the
 * Nightshift home button uses. The icon swaps in the VectorDB mark
 * (three coloured shapes — yellow + pink + black) when unselected, and
 * a solid-white version when the home node is active.
 *
 * Selector: `a[data-test-subj~="nav-item-home"][data-test-subj*="searchHomepage"]`
 * matches the Search home node's anchor because the chrome generates
 * `nav-item-deepLinkId-searchHomepage` as part of the data-test-subj
 * tokens (see `to_navigation_items.tsx` -> `getTestSubj`).
 * ----------------------------------------------------------------------- */

const UNSELECTED_BG = 'none';
const UNSELECTED_HOVER_BG = 'rgba(255, 255, 255, 0.15)';
const SELECTED_BG = 'linear-gradient(131deg, #0B64DD 2.98%, #8144CC 66.24%)';

/**
 * VectorDB mark — three coloured shapes (yellow + pink + black) at 16px.
 * Used when the home button is _not_ active.
 */
const VECTORDB_ICON_COLOURED_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="none" class="search-nav-icon" aria-hidden="true">
  <path d="M30 31H23.8008C21.8282 31 19.8053 29.5514 18.417 27.8936L17.6523 26.8418L20.4033 23.3643C23.8649 18.9884 23.8654 13.0332 20.4043 8.6582L17.5615 5.05566C17.7065 4.88028 17.9621 4.59103 18.417 4.12012C19.4827 3.01703 21.8283 1 23.8008 1H30V31Z" fill="#FEC514"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M2 31V1H7.81071C9.52048 1 11.1605 1.78551 12.1972 3.09966L18.0516 10.5194C20.6497 13.8034 20.6497 18.2178 18.0504 21.5035L12.1954 28.9061C11.1581 30.2173 9.52048 31 7.81426 31H2Z" fill="#F04E98"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M15.3836 24.889L12.1515 21.7002C9.28262 18.3821 9.28262 13.4805 12.1528 10.3774C14.4549 7.92002 15.3836 7.14014 15.3836 7.14014L18.0534 10.3774C20.6896 13.7627 20.6283 18.3645 17.9908 21.7515L15.3836 24.889Z" fill="black"/>
</svg>`;

/**
 * Mono-white version of the VectorDB mark — used when the home button
 * is active (sits on top of the saturated gradient background). All
 * three shapes are filled white so the silhouette reads clearly.
 */
const VECTORDB_ICON_WHITE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="none" class="search-nav-icon" aria-hidden="true">
  <path d="M30 31H23.8008C21.8282 31 19.8053 29.5514 18.417 27.8936L17.6523 26.8418L20.4033 23.3643C23.8649 18.9884 23.8654 13.0332 20.4043 8.6582L17.5615 5.05566C17.7065 4.88028 17.9621 4.59103 18.417 4.12012C19.4827 3.01703 21.8283 1 23.8008 1H30V31Z" fill="#ffffff"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M2 31V1H7.81071C9.52048 1 11.1605 1.78551 12.1972 3.09966L18.0516 10.5194C20.6497 13.8034 20.6497 18.2178 18.0504 21.5035L12.1954 28.9061C11.1581 30.2173 9.52048 31 7.81426 31H2Z" fill="#ffffff"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M15.3836 24.889L12.1515 21.7002C9.28262 18.3821 9.28262 13.4805 12.1528 10.3774C14.4549 7.92002 15.3836 7.14014 15.3836 7.14014L18.0534 10.3774C20.6896 13.7627 20.6283 18.3645 17.9908 21.7515L15.3836 24.889Z" fill="#ffffff"/>
</svg>`;

const HOME_BUTTON_SELECTOR =
  'a[data-test-subj~="nav-item-home"][data-test-subj*="searchHomepage"]';

const ICON_WRAPPER_CLASS = 'kbnChromeNav-iconWrapper';
const ICON_HOST_CLASS = 'search-nav-icon-host';
const SEARCH_STYLED_ATTR = 'data-search-styled';
const SEARCH_HOVER_ATTR = 'data-search-nav-hover';
const SEARCH_LISTENERS_ATTR = 'data-search-nav-listeners';

interface SearchStyles {
  unselectedBg: string;
  unselectedHoverBg: string;
  selectedBg: string;
  unselectedIconSvg: string;
  selectedIconSvg: string;
}

function isActive(button: HTMLAnchorElement): boolean {
  const tokens = button.getAttribute('data-test-subj') ?? '';
  return tokens.split(/\s+/).includes('nav-item-isActive');
}

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

const getIconVariantKey = (active: boolean) => (active ? 'selected' : 'unselected');

const ensureInlineIcon = (wrapper: HTMLElement, iconSvg: string, variantKey: string) => {
  let host = wrapper.querySelector<HTMLElement>(`.${ICON_HOST_CLASS}`);
  if (host?.dataset.searchIconVariant === variantKey) {
    return;
  }

  if (!host) {
    wrapper.querySelector('img')?.remove();
    host = document.createElement('div');
    host.className = ICON_HOST_CLASS;
    host.style.cssText =
      'display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:0;';
    wrapper.prepend(host);
  }

  host.innerHTML = iconSvg;
  host.dataset.searchIconVariant = variantKey;
};

const attachHoverListeners = (button: HTMLAnchorElement) => {
  if (button.hasAttribute(SEARCH_LISTENERS_ATTR)) {
    return;
  }

  button.addEventListener('mouseenter', () => {
    button.setAttribute(SEARCH_HOVER_ATTR, 'true');
  });
  button.addEventListener('mouseleave', () => {
    button.removeAttribute(SEARCH_HOVER_ATTR);
  });
  button.setAttribute(SEARCH_LISTENERS_ATTR, 'true');
};

function applySearchStyles(styles: SearchStyles) {
  const buttons = document.querySelectorAll<HTMLAnchorElement>(HOME_BUTTON_SELECTOR);
  buttons.forEach((button) => {
    const active = isActive(button);
    const bg = active ? styles.selectedBg : styles.unselectedBg;
    const iconSvg = active ? styles.selectedIconSvg : styles.unselectedIconSvg;
    const variantKey = getIconVariantKey(active);

    const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
    if (wrapper) {
      paintBackground(wrapper, bg);
      wrapper.dataset.searchRestBg = bg;
      wrapper.dataset.searchHoverBg = active ? bg : styles.unselectedHoverBg;
      ensureInlineIcon(wrapper, iconSvg, variantKey);
    }

    attachHoverListeners(button);
    button.setAttribute(SEARCH_STYLED_ATTR, 'true');
  });
}

function restoreDefaults() {
  document
    .querySelectorAll<HTMLAnchorElement>(`[${SEARCH_STYLED_ATTR}="true"]`)
    .forEach((button) => {
      const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
      wrapper?.querySelector(`.${ICON_HOST_CLASS}`)?.remove();
      if (wrapper) {
        wrapper.style.removeProperty('background-color');
        wrapper.style.removeProperty('background-image');
        delete wrapper.dataset.searchRestBg;
        delete wrapper.dataset.searchHoverBg;
      }
      button.removeAttribute(SEARCH_HOVER_ATTR);
      button.removeAttribute(SEARCH_LISTENERS_ATTR);
      button.removeAttribute(SEARCH_STYLED_ATTR);
    });
}

/**
 * Search / VectorDB side-nav home: same AI gradient background as
 * Nightshift, but the inline icon is the three-shape VectorDB mark.
 */
export const SearchSidenavGlobalStyles: React.FC = () => {
  const styles: SearchStyles = useMemo(
    () => ({
      unselectedBg: UNSELECTED_BG,
      unselectedHoverBg: UNSELECTED_HOVER_BG,
      selectedBg: SELECTED_BG,
      unselectedIconSvg: VECTORDB_ICON_COLOURED_SVG,
      selectedIconSvg: VECTORDB_ICON_WHITE_SVG,
    }),
    []
  );

  const isApplyingRef = useRef(false);

  useEffect(() => {
    const runApply = () => {
      if (isApplyingRef.current) {
        return;
      }
      isApplyingRef.current = true;
      try {
        applySearchStyles(styles);
      } finally {
        isApplyingRef.current = false;
      }
    };

    runApply();

    const observer = new MutationObserver(runApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-test-subj', 'class'],
    });

    const handlePointerOver = (event: Event) => {
      const button = (event.target as Element).closest<HTMLAnchorElement>(HOME_BUTTON_SELECTOR);
      if (!button) {
        return;
      }
      const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
      const hover = wrapper?.dataset.searchHoverBg;
      if (wrapper && hover) {
        paintBackground(wrapper, hover);
      }
    };
    const handlePointerOut = (event: Event) => {
      const button = (event.target as Element).closest<HTMLAnchorElement>(HOME_BUTTON_SELECTOR);
      if (!button) {
        return;
      }
      const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
      const rest = wrapper?.dataset.searchRestBg;
      if (wrapper && rest) {
        paintBackground(wrapper, rest);
      }
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
