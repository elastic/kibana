/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKbnPalettes } from '@kbn/palettes';
import type { CoreTheme } from '@kbn/core/public';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import type {
  MetricVisualizationState,
  SecondaryTrend,
  SecondaryTrendType,
} from '@kbn/lens-common';
import { getDefaultConfigForMode } from './palette_config';
import { getMappedSecondaryTrendPalettes } from './trend_palette_mapping';
import type { PaletteTriplet, SecondaryTrendPalettes } from './types';

export function getColorMode(
  secondaryTrend: MetricVisualizationState['secondaryTrend'],
  isMetricNumeric: boolean
): SecondaryTrendType {
  if (!secondaryTrend || secondaryTrend.type === 'none') {
    return 'none';
  }
  if (!isMetricNumeric || secondaryTrend.type === 'static') {
    return 'static';
  }
  return 'dynamic';
}

function resolveDynamicTrendConfig(
  secondaryTrend: MetricVisualizationState['secondaryTrend']
): Pick<Extract<SecondaryTrend, { type: 'dynamic' }>, 'paletteId' | 'reversed'> {
  if (secondaryTrend && secondaryTrend.type === 'dynamic') {
    return secondaryTrend;
  }
  return getDefaultConfigForMode('dynamic') as Extract<SecondaryTrend, { type: 'dynamic' }>;
}

export function getTrendPalette(
  colorMode: SecondaryTrendType,
  secondaryTrend: MetricVisualizationState['secondaryTrend'],
  theme: CoreTheme
): PaletteTriplet | undefined {
  if (colorMode !== 'dynamic') {
    return undefined;
  }
  const { paletteId, reversed } = resolveDynamicTrendConfig(secondaryTrend);
  const palette = getKbnPalettes(theme).get(paletteId);
  const colors = palette?.colors(3);
  return (reversed ? colors.reverse() : colors) as PaletteTriplet;
}

const reverseTriplet = ([a, b, c]: PaletteTriplet): PaletteTriplet => [c, b, a];
const getEuiThemeVars = (theme: CoreTheme) => (theme.darkMode ? euiDarkVars : euiLightVars);

export function getSecondaryTrendPalettes(
  colorMode: SecondaryTrendType,
  secondaryTrend: MetricVisualizationState['secondaryTrend'],
  theme: CoreTheme
): SecondaryTrendPalettes | undefined {
  if (colorMode !== 'dynamic') {
    return undefined;
  }

  const euiTheme = getEuiThemeVars(theme);
  const { paletteId, reversed } = resolveDynamicTrendConfig(secondaryTrend);

  const mapped = getMappedSecondaryTrendPalettes(paletteId, euiTheme);
  const palette = mapped?.palette;
  const textPalette = mapped?.textPalette;

  return reversed
    ? { palette: reverseTriplet(palette), textPalette: reverseTriplet(textPalette) }
    : { palette, textPalette };
}

export function getSecondaryDynamicTrendBaselineValue(
  isPrimaryMetricNumeric: boolean,
  baselineValue: number | 'primary'
) {
  // If primary is not numeric, reset baseline value to 0
  if (!isPrimaryMetricNumeric && baselineValue === 'primary') return 0;
  return baselineValue;
}

export function isSecondaryTrendConfigInvalid(
  secondaryTrend: MetricVisualizationState['secondaryTrend'],
  colorMode: SecondaryTrendType,
  isPrimaryMetricNumeric: boolean
): boolean {
  return (
    colorMode !== (secondaryTrend?.type ?? 'none') ||
    (secondaryTrend?.type === 'dynamic' &&
      secondaryTrend?.baselineValue === 'primary' &&
      !isPrimaryMetricNumeric)
  );
}
