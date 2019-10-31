/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, map, toPairs } from 'lodash/fp';

import { ChartSeriesData } from '../../../charts/common';
import { MatrixOverTimeHistogramData } from '../../../../graphql/types';
import { KpiHostsChartColors } from '../kpi_hosts/types';

const formatToChartDataItem = ([key, value]: [
  string,
  MatrixOverTimeHistogramData[]
]): ChartSeriesData => ({
  key,
  value,
});

const addCustomColors = (item: ChartSeriesData) => {
  if (item.key === 'authentication_success') {
    item.color = KpiHostsChartColors.authSuccess;
  }

  if (item.key === 'authentication_failure') {
    item.color = KpiHostsChartColors.authFailure;
  }

  return item;
};

export const getCustomChartData = (data: MatrixOverTimeHistogramData[]): ChartSeriesData[] => {
  const dataGroupedByEvent = groupBy('g', data);
  const dataGroupedEntries = toPairs(dataGroupedByEvent);
  const formattedChartData = map(formatToChartDataItem, dataGroupedEntries);

  return map(addCustomColors, formattedChartData);
};
