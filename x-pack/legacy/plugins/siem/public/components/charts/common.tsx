/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiText, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import {
  CustomSeriesColorsMap,
  DataSeriesColorsValues,
  getSpecId,
  mergeWithDefaultTheme,
  PartialTheme,
  LIGHT_THEME,
  DARK_THEME,
  ScaleType,
  TickFormatter,
  SettingSpecProps,
  Rotation,
  Rendering,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import moment from 'moment-timezone';
import { DEFAULT_DATE_FORMAT_TZ, DEFAULT_DARK_MODE } from '../../../common/constants';
export const defaultChartHeight = '100%';
export const defaultChartWidth = '100%';
const chartDefaultRotation: Rotation = 0;
const chartDefaultRendering: Rendering = 'canvas';
const FlexGroup = styled(EuiFlexGroup)<{ height?: string | null; width?: string | null }>`
  height: ${({ height }) => (height ? height : '100%')};
  width: ${({ width }) => (width ? width : '100%')};
`;

FlexGroup.displayName = 'FlexGroup';

export type UpdateDateRange = (min: number, max: number) => void;

export const ChartHolder = ({
  height = '100%',
  width = '100%',
}: {
  height?: string | null;
  width?: string | null;
}) => (
  <FlexGroup justifyContent="center" alignItems="center" height={height} width={width}>
    <EuiFlexItem grow={false}>
      <EuiText size="s" textAlign="center" color="subdued">
        {i18n.translate('xpack.siem.chart.dataNotAvailableTitle', {
          defaultMessage: 'Chart Data Not Available',
        })}
      </EuiText>
    </EuiFlexItem>
  </FlexGroup>
);

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
export const getTheme = () => {
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
      barsPadding: 0.5,
    },
  };
  const isDarkMode: boolean = chrome.getUiSettingsClient().get(DEFAULT_DARK_MODE);
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
  theme: getTheme(),
};

const kibanaTimezone: string = chrome.getUiSettingsClient().get(DEFAULT_DATE_FORMAT_TZ);
export const browserTimezone = kibanaTimezone === 'Browser' ? moment.tz.guess() : kibanaTimezone;

export const getChartHeight = (customHeight?: number, autoSizerHeight?: number): string => {
  const height = customHeight || autoSizerHeight;
  return height ? `${height}px` : defaultChartHeight;
};

export const getChartWidth = (customWidth?: number, autoSizerWidth?: number): string => {
  const height = customWidth || autoSizerWidth;
  return height ? `${height}px` : defaultChartWidth;
};
