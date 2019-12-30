/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CustomSeriesColorsMap,
  DARK_THEME,
  DataSeriesColorsValues,
  getSpecId,
  LIGHT_THEME,
  mergeWithDefaultTheme,
  PartialTheme,
  Rendering,
  Rotation,
  ScaleType,
  SettingSpecProps,
  TickFormatter,
} from '@elastic/charts';
import moment from 'moment-timezone';
import styled from 'styled-components';
import { useUiSetting } from '../../lib/kibana';
import { DEFAULT_DATE_FORMAT_TZ, DEFAULT_DARK_MODE } from '../../../common/constants';

export const defaultChartHeight = '100%';
export const defaultChartWidth = '100%';
const chartDefaultRotation: Rotation = 0;
const chartDefaultRendering: Rendering = 'canvas';

export type UpdateDateRange = (min: number, max: number) => void;

export interface ChartData {
  x: number | string | null;
  y: number | string | null;
  y0?: number;
  g?: number | string;
}

export interface ChartSeriesConfigs {
  customHeight?: number;
  series?: {
    xScaleType?: ScaleType | undefined;
    yScaleType?: ScaleType | undefined;
  };
  axis?: {
    xTickFormatter?: TickFormatter | undefined;
    yTickFormatter?: TickFormatter | undefined;
  };
  settings?: Partial<SettingSpecProps>;
}

export interface ChartSeriesData {
  key: string;
  value: ChartData[] | [] | null;
  color?: string | undefined;
}

export const WrappedByAutoSizer = styled.div<{ height?: string }>`
  ${style =>
    `
    height: ${style.height != null ? style.height : defaultChartHeight};
  `}
  position: relative;

  &:hover {
    z-index: 100;
  }
`;

WrappedByAutoSizer.displayName = 'WrappedByAutoSizer';

export enum SeriesType {
  BAR = 'bar',
  AREA = 'area',
  LINE = 'line',
}

// Customize colors: https://ela.st/custom-colors
export const getSeriesStyle = (
  seriesKey: string,
  color: string | undefined,
  seriesType?: SeriesType
) => {
  if (!color) return undefined;
  const customSeriesColors: CustomSeriesColorsMap = new Map();
  const dataSeriesColorValues: DataSeriesColorsValues = {
    colorValues: seriesType === SeriesType.BAR ? [seriesKey] : [],
    specId: getSpecId(seriesKey),
  };

  customSeriesColors.set(dataSeriesColorValues, color);

  return customSeriesColors;
};

// Apply margins and paddings: https://ela.st/charts-spacing
const theme: PartialTheme = {
  chartMargins: {
    left: 0,
    right: 0,
    // Apply some paddings to the top to avoid chopping the y tick https://ela.st/chopping-edge
    top: 4,
    bottom: 0,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: {
    barsPadding: 0.05,
  },
};
export const useTheme = () => {
  const isDarkMode = useUiSetting<boolean>(DEFAULT_DARK_MODE);
  const defaultTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  return mergeWithDefaultTheme(theme, defaultTheme);
};

export const chartDefaultSettings = {
  rotation: chartDefaultRotation,
  rendering: chartDefaultRendering,
  animatedData: false,
  showLegend: false,
  showLegendDisplayValue: false,
  debug: false,
};

export const useBrowserTimeZone = () => {
  const kibanaTimezone = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return kibanaTimezone === 'Browser' ? moment.tz.guess() : kibanaTimezone;
};

export const getChartHeight = (customHeight?: number, autoSizerHeight?: number): string => {
  const height = customHeight || autoSizerHeight;
  return height ? `${height}px` : defaultChartHeight;
};

export const getChartWidth = (customWidth?: number, autoSizerWidth?: number): string => {
  const height = customWidth || autoSizerWidth;
  return height ? `${height}px` : defaultChartWidth;
};

export const checkIfAllValuesAreZero = (data: ChartSeriesData[] | null | undefined): boolean =>
  Array.isArray(data) &&
  data.every(series => {
    return Array.isArray(series.value) && (series.value as ChartData[]).every(({ y }) => y === 0);
  });
