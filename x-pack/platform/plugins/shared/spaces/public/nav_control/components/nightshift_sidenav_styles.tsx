/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import React from 'react';

import {
  getNightshiftNavIconSvg,
  type NightshiftNavIconSvgOptions,
} from '../../../common/nightshift_icon';
import { NIGHTSHIFT_SIDENAV_ICON_ANIMATION_CSS } from '../../../common/nightshift_sidenav_icon_animation';

const UNSELECTED_BG = 'none';
const UNSELECTED_HOVER_BG = 'rgba(255, 255, 255, 0.15)';
const SELECTED_BG = 'linear-gradient(131deg, #0B64DD 2.98%, #8144CC 66.24%)';
const UNSELECTED_ICON_START = '#D9E8FF';
const UNSELECTED_ICON_END = '#ECE2FE';
const SELECTED_ICON_FILL = '#FFFFFF';

const HOME_BUTTON_SELECTOR =
  'a[data-test-subj~="nav-item-home"][data-test-subj*="nightshift"]';

const ICON_WRAPPER_CLASS = 'kbnChromeNav-iconWrapper';
const ICON_HOST_CLASS = 'nightshift-nav-icon-host';
const NIGHTSHIFT_STYLED_ATTR = 'data-nightshift-styled';
const NIGHTSHIFT_HOVER_ATTR = 'data-nightshift-nav-hover';
const NIGHTSHIFT_LISTENERS_ATTR = 'data-nightshift-nav-listeners';
const ANIMATION_STYLE_ID = 'nightshift-sidenav-icon-animation';

interface NightshiftStyles {
  unselectedBg: string;
  unselectedHoverBg: string;
  selectedBg: string;
  unselectedIcon: NightshiftNavIconSvgOptions;
  selectedIcon: NightshiftNavIconSvgOptions;
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

/**
 * Swap the default <img> for inline SVG once per variant. Skips writes when
 * nothing changed so the MutationObserver cannot loop.
 */
const ensureInlineIcon = (
  wrapper: HTMLElement,
  iconOptions: NightshiftNavIconSvgOptions,
  variantKey: string
) => {
  let host = wrapper.querySelector<HTMLElement>(`.${ICON_HOST_CLASS}`);
  if (host?.dataset.nightshiftIconVariant === variantKey) {
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

  host.innerHTML = getNightshiftNavIconSvg({
    ...iconOptions,
    gradientId: `nightshift-nav-${variantKey}`,
  });
  host.dataset.nightshiftIconVariant = variantKey;
};

const attachHoverListeners = (button: HTMLAnchorElement) => {
  if (button.hasAttribute(NIGHTSHIFT_LISTENERS_ATTR)) {
    return;
  }

  button.addEventListener('mouseenter', () => {
    button.setAttribute(NIGHTSHIFT_HOVER_ATTR, 'true');
  });
  button.addEventListener('mouseleave', () => {
    button.removeAttribute(NIGHTSHIFT_HOVER_ATTR);
  });
  button.setAttribute(NIGHTSHIFT_LISTENERS_ATTR, 'true');
};

function applyNightshiftStyles(styles: NightshiftStyles) {
  const buttons = document.querySelectorAll<HTMLAnchorElement>(HOME_BUTTON_SELECTOR);
  buttons.forEach((button) => {
    const active = isActive(button);
    const bg = active ? styles.selectedBg : styles.unselectedBg;
    const iconOptions = active ? styles.selectedIcon : styles.unselectedIcon;
    const variantKey = getIconVariantKey(active);

    const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
    if (wrapper) {
      paintBackground(wrapper, bg);
      wrapper.dataset.nightshiftRestBg = bg;
      wrapper.dataset.nightshiftHoverBg = active ? bg : styles.unselectedHoverBg;
      ensureInlineIcon(wrapper, iconOptions, variantKey);
    }

    attachHoverListeners(button);
    button.setAttribute(NIGHTSHIFT_STYLED_ATTR, 'true');
  });
}

function restoreDefaults() {
  document.querySelectorAll<HTMLAnchorElement>(`[${NIGHTSHIFT_STYLED_ATTR}="true"]`).forEach(
    (button) => {
      const wrapper = button.querySelector<HTMLElement>(`.${ICON_WRAPPER_CLASS}`);
      wrapper?.querySelector(`.${ICON_HOST_CLASS}`)?.remove();
      if (wrapper) {
        wrapper.style.removeProperty('background-color');
        wrapper.style.removeProperty('background-image');
        delete wrapper.dataset.nightshiftRestBg;
        delete wrapper.dataset.nightshiftHoverBg;
      }
      button.removeAttribute(NIGHTSHIFT_HOVER_ATTR);
      button.removeAttribute(NIGHTSHIFT_LISTENERS_ATTR);
      button.removeAttribute(NIGHTSHIFT_STYLED_ATTR);
    }
  );
}

/**
 * Nightshift side-nav home: brand colours + inline SVG with hover motion
 * (gentle moon drift and star twinkle, infinite while hovered).
 */
export const NightshiftSidenavGlobalStyles: React.FC = () => {
  const styles: NightshiftStyles = useMemo(
    () => ({
      unselectedBg: UNSELECTED_BG,
      unselectedHoverBg: UNSELECTED_HOVER_BG,
      selectedBg: SELECTED_BG,
      unselectedIcon: {
        size: 16,
        startColor: UNSELECTED_ICON_START,
        endColor: UNSELECTED_ICON_END,
      },
      selectedIcon: {
        size: 16,
        solidColor: SELECTED_ICON_FILL,
      },
    }),
    []
  );

  const isApplyingRef = useRef(false);

  useEffect(() => {
    if (!document.getElementById(ANIMATION_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = ANIMATION_STYLE_ID;
      style.textContent = `
        .${ICON_HOST_CLASS} .nightshift-nav-icon { display: block; }
        ${NIGHTSHIFT_SIDENAV_ICON_ANIMATION_CSS}
      `;
      document.head.appendChild(style);
    }

    const runApply = () => {
      if (isApplyingRef.current) {
        return;
      }
      isApplyingRef.current = true;
      try {
        applyNightshiftStyles(styles);
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
      const hover = wrapper?.dataset.nightshiftHoverBg;
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
      const rest = wrapper?.dataset.nightshiftRestBg;
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
      document.getElementById(ANIMATION_STYLE_ID)?.remove();
      restoreDefaults();
    };
  }, [styles]);

  return null;
};
