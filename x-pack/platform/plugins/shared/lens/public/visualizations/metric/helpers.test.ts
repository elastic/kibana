/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnPalette } from '@kbn/palettes';
import type { CoreTheme } from '@kbn/core/public';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import type { SecondaryTrend } from '@kbn/lens-common';
import { getSecondaryTrendPalettes } from './helpers';

const lightTheme = { darkMode: false } as CoreTheme;
const darkTheme = { darkMode: true } as CoreTheme;

const makeDynamicTrend = (
  paletteId: string,
  reversed = false
): Extract<SecondaryTrend, { type: 'dynamic' }> => ({
  type: 'dynamic',
  visuals: 'both',
  paletteId,
  reversed,
  baselineValue: 0,
});

describe('getSecondaryTrendPalettes', () => {
  it('returns undefined for non-dynamic color modes', () => {
    expect(
      getSecondaryTrendPalettes('static', makeDynamicTrend(KbnPalette.CompareTo), lightTheme)
    ).toBeUndefined();
    expect(
      getSecondaryTrendPalettes('none', makeDynamicTrend(KbnPalette.CompareTo), lightTheme)
    ).toBeUndefined();
  });

  it('falls back to default config when secondaryTrend is undefined', () => {
    const result = getSecondaryTrendPalettes('dynamic', undefined, lightTheme);
    expect(result).toBeDefined();
    expect(result!.palette).toHaveLength(3);
    expect(result!.textPalette).toHaveLength(3);
  });

  describe('CompareTo palette', () => {
    it('returns correct EUI tokens for light theme', () => {
      const result = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.CompareTo),
        lightTheme
      )!;
      expect(result.palette).toEqual([
        euiLightVars.euiColorBackgroundLightDanger,
        euiLightVars.euiColorBackgroundLightText,
        euiLightVars.euiColorBackgroundLightSuccess,
      ]);
      expect(result.textPalette).toEqual([
        euiLightVars.euiColorTextDanger,
        euiLightVars.euiColorTextParagraph,
        euiLightVars.euiColorTextSuccess,
      ]);
    });

    it('uses dark theme tokens when darkMode is true', () => {
      const result = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.CompareTo),
        darkTheme
      )!;
      expect(result.palette[0]).toBe(euiDarkVars.euiColorBackgroundLightDanger);
      expect(result.textPalette[0]).toBe(euiDarkVars.euiColorTextDanger);
    });

    it('reverses both palettes when reversed is true', () => {
      const normal = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.CompareTo, false),
        lightTheme
      )!;
      const reversed = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.CompareTo, true),
        lightTheme
      )!;

      expect(reversed.palette).toEqual([normal.palette[2], normal.palette[1], normal.palette[0]]);
      expect(reversed.textPalette).toEqual([
        normal.textPalette[2],
        normal.textPalette[1],
        normal.textPalette[0],
      ]);
    });
  });

  describe('Complementary palette', () => {
    it('returns correct EUI tokens', () => {
      const result = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.Complementary),
        lightTheme
      )!;
      expect(result.palette).toEqual([
        euiLightVars.euiColorBackgroundLightPrimary,
        euiLightVars.euiColorBackgroundLightText,
        euiLightVars.euiColorBackgroundLightWarning,
      ]);
      expect(result.textPalette).toEqual([
        euiLightVars.euiColorTextPrimary,
        euiLightVars.euiColorTextParagraph,
        euiLightVars.euiColorTextWarning,
      ]);
    });
  });

  describe('Temperature palette', () => {
    it('returns correct EUI tokens', () => {
      const result = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.Temperature),
        lightTheme
      )!;
      expect(result.palette).toEqual([
        euiLightVars.euiColorBackgroundLightPrimary,
        euiLightVars.euiColorBackgroundLightText,
        euiLightVars.euiColorBackgroundLightDanger,
      ]);
      expect(result.textPalette).toEqual([
        euiLightVars.euiColorTextPrimary,
        euiLightVars.euiColorTextParagraph,
        euiLightVars.euiColorTextDanger,
      ]);
    });
  });

  describe('unknown palette', () => {
    it('falls back to getKbnPalettes and uses textParagraph for text', () => {
      const result = getSecondaryTrendPalettes(
        'dynamic',
        makeDynamicTrend(KbnPalette.Cool),
        lightTheme
      )!;
      expect(result.palette).toHaveLength(3);
      expect(result.textPalette).toEqual([
        euiLightVars.euiColorTextParagraph,
        euiLightVars.euiColorTextParagraph,
        euiLightVars.euiColorTextParagraph,
      ]);
    });
  });
});
