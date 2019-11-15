/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScaleType, niceTimeFormatter, Position } from '@elastic/charts';
import { get, groupBy, map, toPairs } from 'lodash/fp';
import numeral from '@elastic/numeral';
import { AuthMatrixDataFields } from '../page/hosts/authentications_over_time/utils';
import { MatrixOverTimeHistogramData, MatrixOverOrdinalHistogramData } from '../../graphql/types';
import { UpdateDateRange, ChartSeriesData } from '../charts/common';

export const getBarchartConfigs = ({
  from,
  to,
  scaleType,
  onBrushEnd,
  yTickFormatter,
}: {
  from: number;
  to: number;
  scaleType: ScaleType;
  onBrushEnd: UpdateDateRange;
  yTickFormatter?: (value: number) => string;
}) => ({
  series: {
    xScaleType: scaleType || ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: scaleType === ScaleType.Time ? niceTimeFormatter([from, to]) : undefined,
    yTickFormatter:
      yTickFormatter != null
        ? yTickFormatter
        : (value: string | number): string => value.toLocaleString(),
    tickSize: 8,
  },
  settings: {
    legendPosition: Position.Bottom,
    onBrushEnd,
    showLegend: true,
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
  customHeight: 324,
});

export const formatToChartDataItem = ([key, value]: [
  string,
  MatrixHistogramDataTypes[]
]): ChartSeriesData => ({
  key,
  value,
});

export const getCustomChartData = (
  data: MatrixHistogramDataTypes[],
  mapping?: MatrixHistogramMappingTypes
): ChartSeriesData[] => {
  const dataGroupedByEvent = groupBy('g', data);
  const dataGroupedEntries = toPairs(dataGroupedByEvent);
  const formattedChartData = map(formatToChartDataItem, dataGroupedEntries);

  if (mapping)
    return map((item: ChartSeriesData) => {
      const customColor = get(`${item.key}.color`, mapping);
      item.color = customColor;
      return item;
    }, formattedChartData);
  else return formattedChartData;
};

export type MatrixHistogramDataTypes = MatrixOverTimeHistogramData | MatrixOverOrdinalHistogramData;
export type MatrixHistogramMappingTypes = AuthMatrixDataFields;

export const bytesFormatter = (value: number) => {
  return numeral(value).format('0,0.[0]b');
};
