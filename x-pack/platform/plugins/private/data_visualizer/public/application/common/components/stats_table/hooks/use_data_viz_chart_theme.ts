/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { PartialTheme } from '@elastic/charts';
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';

interface DataVizChartThemeOptions {
  disableGridLines?: boolean;
}

export const useDataVizChartTheme = (options: DataVizChartThemeOptions = {}): PartialTheme => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;
  const chartTheme = useMemo<PartialTheme>(() => {
    // Amsterdam + Borealis
    const AREA_SERIES_COLOR = euiTheme.colors.vis.euiColorVis0;
    return {
      axes: {
        tickLabel: {
          fontSize: parseInt(euiFontSizeXS, 10),
          fontFamily: euiTheme.font.family,
          fontStyle: 'italic',
        },
        ...(options.disableGridLines
          ? { gridLine: { horizontal: { visible: false }, vertical: { visible: false } } }
          : {}),
      },
      background: { color: 'transparent' },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 4,
        bottom: 0,
      },
      scales: { barsPadding: 0.1 },
      colors: {
        vizColors: [AREA_SERIES_COLOR],
      },
      areaSeriesStyle: {
        line: {
          strokeWidth: 1,
          visible: true,
        },
        point: {
          visible: 'never',
          radius: 0,
          opacity: 0,
        },
        area: { visible: true, opacity: 1 },
      },
    };
  }, [euiFontSizeXS, euiTheme, options.disableGridLines]);
  return chartTheme;
};
