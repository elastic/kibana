/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScaleType, Position } from '@elastic/charts';
import { get, groupBy, map, toPairs } from 'lodash/fp';

import { UpdateDateRange, ChartSeriesData } from '../charts/common';
import { MatrixHistogramDataTypes, MatrixHistogramMappingTypes } from './types';
import { histogramDateTimeFormatter } from '../utils';

interface GetBarchartConfigsProps {
  chartHeight?: number;
  from: number;
  legendPosition?: Position;
  to: number;
  scaleType: ScaleType;
  onBrushEnd: UpdateDateRange;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
}

export const DEFAULT_CHART_HEIGHT = 174;

export const getBarchartConfigs = ({
  chartHeight,
  from,
  legendPosition,
  to,
  scaleType,
  onBrushEnd,
  yTickFormatter,
  showLegend,
}: GetBarchartConfigsProps) => ({
  series: {
    xScaleType: scaleType || ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter:
      scaleType === ScaleType.Time ? histogramDateTimeFormatter([from, to]) : undefined,
    yTickFormatter:
      yTickFormatter != null
        ? yTickFormatter
        : (value: string | number): string => value.toLocaleString(),
    tickSize: 8,
  },
  settings: {
    legendPosition: legendPosition ?? Position.Bottom,
    onBrushEnd,
    showLegend: showLegend ?? true,
    theme: {
      scales: {
        barsPadding: 0.08,
      },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  },
  customHeight: chartHeight ?? DEFAULT_CHART_HEIGHT,
});

export const formatToChartDataItem = ([key, value]: [
  string,
  MatrixHistogramDataTypes[]
]): ChartSeriesData => ({
  key,
  value,
});

export const getCustomChartData = (
  data: MatrixHistogramDataTypes[] | null,
  mapping?: MatrixHistogramMappingTypes
): ChartSeriesData[] => {
  if (!data) return [];
  const dataGroupedByEvent = groupBy('g', data);
  const dataGroupedEntries = toPairs(dataGroupedByEvent);
  const formattedChartData = map(formatToChartDataItem, dataGroupedEntries);

  if (mapping)
    return map((item: ChartSeriesData) => {
      const mapItem = get(item.key, mapping);
      return { ...item, color: mapItem.color };
    }, formattedChartData);
  else return formattedChartData;
};
