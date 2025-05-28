/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KbnPalette, getKbnPalettes } from '@kbn/palettes';
import type { CoreTheme } from '@kbn/core/public';
import { MetricVisualizationState, SecondaryTrend, SecondaryTrendType } from './types';
import { VisualizationDimensionEditorProps } from '../../types';
import { SECONDARY_DEFAULT_STATIC_COLOR } from './constants';

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

export function getPrefixSelected(
  state: VisualizationDimensionEditorProps<MetricVisualizationState>['state'],
  { defaultPrefix, colorMode }: { defaultPrefix: string; colorMode: SecondaryTrendType }
): { mode: 'auto' | 'none' } | { mode: 'custom'; label: string } {
  const isAutoPrefix = state.secondaryPrefix === undefined;
  const hasPrefixOverride =
    isAutoPrefix &&
    // use colorMode as gatekeeper to avoid checking the secondaryTrend as dynamic when
    // it is not enabled due to other conflicts (i.e. primary metric is not numeric)
    colorMode === 'dynamic' &&
    state.secondaryTrend?.type === 'dynamic' &&
    state.secondaryTrend.baselineValue === 'primary';

  if (isAutoPrefix) {
    return hasPrefixOverride
      ? {
          mode: 'custom',
          label: i18n.translate('xpack.lens.metric.prefixText.labelTrendOverride', {
            defaultMessage: 'Difference',
          }),
        }
      : { mode: 'auto' };
  }
  if (state.secondaryPrefix === '') {
    return { mode: 'none' };
  }
  return { mode: 'custom', label: state.secondaryPrefix ?? defaultPrefix };
}

export function getDefaultConfigForMode(mode: SecondaryTrendType): SecondaryTrend {
  if (mode === 'none') {
    return { type: 'none' };
  }
  if (mode === 'static') {
    return {
      type: 'static',
      color: SECONDARY_DEFAULT_STATIC_COLOR,
    };
  }
  return {
    type: 'dynamic',
    visuals: 'both',
    paletteId: KbnPalette.CompareTo,
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
