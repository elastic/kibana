/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KbnPalette, getKbnPalettes } from '@kbn/palettes';
import type { CoreTheme } from '@kbn/core/public';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import type {
  VisualizationDimensionEditorProps,
  MetricVisualizationState,
  SecondaryTrend,
  SecondaryTrendType,
} from '@kbn/lens-common';
import { LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR } from '@kbn/lens-common';

export interface SecondaryTrendPalettes {
  palette: [string, string, string];
  textPalette: [string, string, string];
}

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

export function getSecondaryLabelSelected(
  state: VisualizationDimensionEditorProps<MetricVisualizationState>['state'],
  {
    defaultSecondaryLabel,
    colorMode,
    isPrimaryMetricNumeric,
  }: {
    defaultSecondaryLabel: string;
    colorMode: SecondaryTrendType;
    isPrimaryMetricNumeric: boolean;
  }
): { mode: 'auto' | 'none' } | { mode: 'custom'; label: string } {
  const isAutoSecondaryLabel = state.secondaryLabel === undefined;
  const hasSecondaryLabelOverride =
    isAutoSecondaryLabel &&
    // use colorMode as gatekeeper to avoid checking the secondaryTrend as dynamic when
    // it is not enabled due to other conflicts (i.e. primary metric is not numeric)
    colorMode === 'dynamic' &&
    state.secondaryTrend?.type === 'dynamic' &&
    state.secondaryTrend.baselineValue === 'primary' &&
    isPrimaryMetricNumeric;

  if (isAutoSecondaryLabel) {
    return hasSecondaryLabelOverride
      ? {
          mode: 'custom',
          label: i18n.translate('xpack.lens.metric.prefixText.labelTrendOverride', {
            defaultMessage: 'Difference',
          }),
        }
      : { mode: 'auto' };
  }
  if (state.secondaryLabel === '') {
    return { mode: 'none' };
  }
  return { mode: 'custom', label: state.secondaryLabel ?? defaultSecondaryLabel };
}

const DEFAULT_PALETTE_ID = KbnPalette.CompareTo;
export function getDefaultConfigForMode(mode: SecondaryTrendType): SecondaryTrend {
  if (mode === 'none') {
    return { type: 'none' };
  }
  if (mode === 'static') {
    return {
      type: 'static',
      color: LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR,
    };
  }
  return {
    type: 'dynamic',
    visuals: 'both',
    paletteId: DEFAULT_PALETTE_ID,
    reversed: false,
    baselineValue: 0,
  };
}

export function getTrendPalette(
  colorMode: SecondaryTrendType,
  secondaryTrend: MetricVisualizationState['secondaryTrend'],
  theme: CoreTheme
): [string, string, string] | undefined {
  if (colorMode !== 'dynamic') {
    return undefined;
  }
  if (!secondaryTrend || secondaryTrend.type !== colorMode) {
    const defaultConfig = getDefaultConfigForMode(colorMode) as Extract<
      SecondaryTrend,
      { type: 'dynamic' }
    >;
    const palette = getKbnPalettes(theme).get(defaultConfig.paletteId);
    const colors = palette?.colors(3);
    return (defaultConfig.reversed ? colors.reverse() : colors) as [string, string, string];
  }
  const palette = getKbnPalettes(theme).get(secondaryTrend.paletteId);
  const colors = palette?.colors(3);
  return (secondaryTrend.reversed ? colors.reverse() : colors) as [string, string, string];
}

type PaletteTriplet = [string, string, string];

const reverseTriplet = ([a, b, c]: PaletteTriplet): PaletteTriplet => [c, b, a];
const getEuiThemeVars = (theme: CoreTheme) => (theme.darkMode ? euiDarkVars : euiLightVars);
const getMappedSecondaryTrendPalettes = (
  paletteId: string,
  euiTheme: ReturnType<typeof getEuiThemeVars>
): SecondaryTrendPalettes => {
  const euiTextParagraph = euiTheme.euiColorTextParagraph;

  // Mapping: https://github.com/elastic/kibana/issues/251614
  const palettesById: Record<string, SecondaryTrendPalettes> = {
    [KbnPalette.CompareTo]: {
      palette: [
        euiTheme.euiColorBackgroundLightDanger,
        euiTheme.euiColorBackgroundLightText,
        euiTheme.euiColorBackgroundLightSuccess,
      ],
      textPalette: [euiTheme.euiColorTextDanger, euiTextParagraph, euiTheme.euiColorTextSuccess],
    },
    [KbnPalette.Complementary]: {
      palette: [
        euiTheme.euiColorBackgroundLightPrimary,
        euiTheme.euiColorBackgroundLightText,
        euiTheme.euiColorBackgroundLightWarning,
      ],
      textPalette: [euiTheme.euiColorTextPrimary, euiTextParagraph, euiTheme.euiColorTextWarning],
    },
    [KbnPalette.Temperature]: {
      palette: [
        euiTheme.euiColorBackgroundLightPrimary,
        euiTheme.euiColorBackgroundLightText,
        euiTheme.euiColorBackgroundLightDanger,
      ],
      textPalette: [euiTheme.euiColorTextPrimary, euiTextParagraph, euiTheme.euiColorTextDanger],
    },
  };

  return palettesById[paletteId] ?? palettesById[DEFAULT_PALETTE_ID]!;
};

export function getSecondaryTrendPalettes(
  colorMode: SecondaryTrendType,
  secondaryTrend: MetricVisualizationState['secondaryTrend'],
  theme: CoreTheme
): SecondaryTrendPalettes | undefined {
  if (colorMode !== 'dynamic') {
    return undefined;
  }

  const euiTheme = getEuiThemeVars(theme);
  const { paletteId, reversed } =
    secondaryTrend && secondaryTrend.type === 'dynamic'
      ? secondaryTrend
      : (getDefaultConfigForMode('dynamic') as Extract<SecondaryTrend, { type: 'dynamic' }>);

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
    colorMode !== secondaryTrend?.type ||
    (secondaryTrend?.type === 'dynamic' &&
      secondaryTrend?.baselineValue === 'primary' &&
      !isPrimaryMetricNumeric)
  );
}
