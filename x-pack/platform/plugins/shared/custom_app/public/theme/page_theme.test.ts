/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THEME_ACCENTS } from '@kbn/custom-app-common';
import { ACCENT_COLORS, getThemeModifications, hasThemeModifications } from './page_theme';

/** The WCAG relative luminance of a colour written as #rrggbb. */
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

// What WCAG AA asks of text, and what the backgrounds of Kibana are, near enough.
const AA = 4.5;
const WHITE = '#FFFFFF';
const DARK_BACKGROUND = '#0B1628';

describe('the accents of a page', () => {
  it('has a colour for every accent the schema allows, and no other', () => {
    expect(Object.keys(ACCENT_COLORS).sort()).toEqual([...THEME_ACCENTS].sort());
  });

  describe.each(THEME_ACCENTS)('%s', (accent) => {
    const colors = ACCENT_COLORS[accent];

    it('is readable as the fill of a button, with white text on it', () => {
      expect(contrast(colors.fill, WHITE)).toBeGreaterThanOrEqual(AA);
    });

    it('is readable as text and as an icon on a light background', () => {
      expect(contrast(colors.text, WHITE)).toBeGreaterThanOrEqual(AA);
    });

    it('is readable as text and as an icon on a dark background', () => {
      expect(contrast(colors.textOnDark, DARK_BACKGROUND)).toBeGreaterThanOrEqual(AA);
    });

    it('has a wash that text of the accent is still readable on, in light and in dark', () => {
      expect(contrast(colors.text, colors.washOnLight)).toBeGreaterThanOrEqual(AA);
      expect(contrast(colors.textOnDark, colors.washOnDark)).toBeGreaterThanOrEqual(AA);
    });
  });
});

describe('what a theme changes', () => {
  it('is nothing for a page that has no theme, or an empty one', () => {
    expect(getThemeModifications(undefined)).toEqual({});
    expect(getThemeModifications({})).toEqual({});
    expect(hasThemeModifications(undefined)).toBe(false);
    expect(hasThemeModifications({})).toBe(false);
  });

  it('is the colours of what can be pressed or followed, in light and in dark, for an accent', () => {
    const { colors } = getThemeModifications({ accent: 'purple' });

    expect(colors).toMatchObject({
      LIGHT: {
        textPrimary: ACCENT_COLORS.purple.text,
        backgroundFilledPrimary: ACCENT_COLORS.purple.fill,
      },
      DARK: { textPrimary: ACCENT_COLORS.purple.textOnDark },
    });
    expect(hasThemeModifications({ accent: 'purple' })).toBe(true);
  });

  it('is the corners, and nothing else, for a shape', () => {
    const soft = getThemeModifications({ shape: 'soft' });
    const sharp = getThemeModifications({ shape: 'sharp' });

    expect(Object.keys(soft)).toEqual(['border']);
    expect(soft.border?.radius).toEqual({ small: '8px', medium: '14px' });
    expect(sharp.border?.radius).toEqual({ small: '0px', medium: '2px' });
    expect(hasThemeModifications({ shape: 'sharp' })).toBe(true);
  });

  it('is both, when a theme has both', () => {
    const modifications = getThemeModifications({ accent: 'teal', shape: 'soft' });

    expect(Object.keys(modifications).sort()).toEqual(['border', 'colors']);
  });
});
