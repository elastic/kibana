/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed, EuiThemeShape } from '@elastic/eui';
import { type euiDarkVars as EuiThemeVariables } from '@kbn/ui-theme';
import { MetricVisualizationState, TrendEUIColors } from './types';

export function getColorMode(
  colorMode: MetricVisualizationState['secondaryColorMode'],
  isMetricNumeric: boolean
): Required<MetricVisualizationState['secondaryColorMode']> {
  if (!colorMode || colorMode === 'none') {
    return 'none';
  }
  if (!isMetricNumeric || colorMode === 'static') {
    return 'static';
  }
  return 'dynamic';
}

export function isEUIColor(color: string, euiTheme: EuiThemeComputed<{}>): color is TrendEUIColors {
  return color in euiTheme.colors || color in euiTheme.colors.vis;
}

export function getColorFromEUI(color: string, euiTheme: EuiThemeComputed<{}>): string | undefined {
  if (typeof color !== 'string') {
    return undefined;
  }
  if (isEUIColor(color, euiTheme)) {
    if (color in euiTheme.colors.vis) {
      return euiTheme.colors.vis[color as keyof typeof euiTheme.colors.vis];
    }
    return euiTheme.colors[
      color as Exclude<keyof typeof euiTheme.colors, 'vis' | 'DARK' | 'LIGHT'>
    ];
  }
  return color;
}

/**
 * Unfortunately theme context is available only thru React context
 * so here it will rebuild the colors portion of the theme object from the
 * static JSON
 * @returns EuiThemeComputed
 */
export function getEuiThemeColors(euiVariables: typeof EuiThemeVariables) {
  const prefix = 'euiColor';
  const colorsLookup: Partial<EuiThemeComputed<{}>['colors']> = {};
  for (const [key, value] of Object.entries(euiVariables)) {
    if (key.startsWith(prefix)) {
      if (/euiColorVis/.test(key)) {
        if (!('vis' in colorsLookup)) {
          colorsLookup.vis = {} as EuiThemeComputed<{}>['colors']['vis'];
        }
        if (colorsLookup.vis) {
          colorsLookup.vis[key as keyof EuiThemeShape['colors']['vis']] = value as string;
        }
      } else {
        const postFixKey = key.replace(prefix, '');
        const newKey = (postFixKey.charAt(0).toLowerCase() +
          postFixKey.slice(1)) as keyof EuiThemeShape['colors']['LIGHT'];
        colorsLookup[newKey] = value as string;
      }
    }
  }
  return { colors: colorsLookup } as EuiThemeComputed<{}>;
}
