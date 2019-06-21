/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import numeral from '@elastic/numeral';
import { Coordinate } from '../../../../../typings/timeseries';
import { TransactionLineChart } from '../../charts/TransactionCharts/TransactionLineChart';
import { asPercent } from '../../../../utils/formatters';
import { unit } from '../../../../style/variables';

interface Props {
  timeseries: Array<{
    name: string;
    color: string;
    values: Array<{ x: number; y: number }>;
  }>;
}

const TransactionBreakdownGraph: React.FC<Props> = props => {
  const { timeseries } = props;

  const series: React.ComponentProps<
    typeof TransactionLineChart
  >['series'] = useMemo(
    () => {
      return timeseries.map(timeseriesConfig => {
        return {
          title: timeseriesConfig.name,
          color: timeseriesConfig.color,
          data: timeseriesConfig.values,
          type: 'area',
          hideLegend: true
        };
      }, {});
    },
    [timeseries]
  );

  const tickFormatY = useCallback((y: number | null) => {
    return numeral(y || 0).format('0 %');
  }, []);

  const formatTooltipValue = useCallback((coordinate: Coordinate) => {
    return asPercent(coordinate.y || 0, 1);
  }, []);

  return (
    <TransactionLineChart
      series={series}
      stacked={true}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      yMax={1}
      height={unit * 12}
    />
  );
};

export { TransactionBreakdownGraph };
