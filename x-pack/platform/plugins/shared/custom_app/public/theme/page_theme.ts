/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeModifications } from '@elastic/eui';
import { THEME_ACCENTS, type AppTheme } from '@kbn/custom-app-common';

type Accent = NonNullable<AppTheme['accent']>;

interface AccentColors {
  /** What fills a button, with white text on it. */
  fill: string;
  /** Text and icons that can be followed or pressed, on the light background. */
  text: string;
  /** The same, on the dark background, lighter so that it can be read there. */
  textOnDark: string;
  /** A light wash of the accent, behind a selected or highlighted thing, on light and on dark. */
  washOnLight: string;
  washOnDark: string;
}

/**
 * The accents a page can have. Each is checked, in a test, to be readable: its fill with white text
 * on it, and its text on both backgrounds, at the level that WCAG AA asks for. That is why they are
 * a short list of names and not any colour.
 */
export const ACCENT_COLORS: Readonly<Record<Accent, AccentColors>> = {
  blue: {
    fill: '#0B64DD',
    text: '#0B64DD',
    textOnDark: '#79AAF0',
    washOnLight: '#E6EFFC',
    washOnDark: '#12294D',
  },
  teal: {
    fill: '#00717D',
    text: '#00717D',
    textOnDark: '#5FC3CE',
    washOnLight: '#E0F2F4',
    washOnDark: '#0E3438',
  },
  purple: {
    fill: '#6A35C9',
    text: '#6A35C9',
    textOnDark: '#B79CF2',
    washOnLight: '#EEE8FA',
    washOnDark: '#2A1B4F',
  },
  pink: {
    fill: '#B5206B',
    text: '#B5206B',
    textOnDark: '#F28DB9',
    washOnLight: '#FAE6EF',
    washOnDark: '#4A1631',
  },
  orange: {
    fill: '#A64B00',
    text: '#A64B00',
    textOnDark: '#F0A25A',
    washOnLight: '#FBEBDD',
    washOnDark: '#4A2A0E',
  },
  green: {
    fill: '#1B7A44',
    text: '#1B7A44',
    textOnDark: '#6CC48C',
    washOnLight: '#E1F2E8',
    washOnDark: '#12351F',
  },
  red: {
    fill: '#BD271E',
    text: '#BD271E',
    textOnDark: '#F59A93',
    washOnLight: '#FBE7E5',
    washOnDark: '#4C1A17',
  },
};

/** How round the corners are, for each shape. Left out, they are as Kibana has them. */
const RADIUS = {
  soft: { small: '8px', medium: '14px' },
  sharp: { small: '0px', medium: '2px' },
} as const;

/**
 * What the theme of a page changes in how EUI draws what is inside it, as the modifications EUI
 * accepts for a part of the page. Only the colours of what can be pressed or followed, and the
 * corners, change; nothing is reached into from outside. A page with no theme has none.
 */
export const getThemeModifications = (theme: AppTheme | undefined): EuiThemeModifications => {
  const modifications: EuiThemeModifications = {};

  if (theme?.accent) {
    const accent = ACCENT_COLORS[theme.accent];
    // EUI takes colours by mode, as `{ LIGHT: { token }, DARK: { token } }`, and ignores a token that
    // is given a value for both modes at once.
    modifications.colors = {
      LIGHT: {
        primary: accent.fill,
        primaryText: accent.text,
        textPrimary: accent.text,
        link: accent.text,
        backgroundFilledPrimary: accent.fill,
        backgroundLightPrimary: accent.washOnLight,
        backgroundBasePrimary: accent.washOnLight,
        borderStrongPrimary: accent.fill,
        borderBasePrimary: accent.fill,
      },
      DARK: {
        primary: accent.fill,
        primaryText: accent.textOnDark,
        textPrimary: accent.textOnDark,
        link: accent.textOnDark,
        backgroundFilledPrimary: accent.fill,
        backgroundLightPrimary: accent.washOnDark,
        backgroundBasePrimary: accent.washOnDark,
        borderStrongPrimary: accent.textOnDark,
        borderBasePrimary: accent.textOnDark,
      },
    } as EuiThemeModifications['colors'];
  }

  if (theme?.shape) {
    modifications.border = { radius: { ...RADIUS[theme.shape] } };
  }

  return modifications;
};

/**
 * The theme as it is now: the accent is the value of the state key it follows, when that is an
 * accent, and the accent it names otherwise.
 */
export const resolveTheme = (
  theme: AppTheme | undefined,
  values: Readonly<Record<string, unknown>>
): AppTheme | undefined => {
  if (!theme?.accentFrom) return theme;
  const value = values[theme.accentFrom];
  const accent = THEME_ACCENTS.find((name) => name === value) ?? theme.accent;
  return { ...theme, accent };
};

/**
 * Whether a theme changes anything at all. One that follows a value is always kept, so that the
 * app is not drawn again from the start when the value first gives it an accent.
 */
export const hasThemeModifications = (theme: AppTheme | undefined): boolean =>
  Boolean(theme?.accent || theme?.accentFrom || theme?.shape);
