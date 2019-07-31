/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import numeral from '@elastic/numeral';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { TransactionLineChart } from '../../charts/TransactionCharts/TransactionLineChart';
import { asPercent } from '../../../../utils/formatters';
import { unit } from '../../../../style/variables';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';

interface Props {
  timeseries: TimeSeries[];
}

const tickFormatY = (y: number | null | undefined) => {
  return numeral(y || 0).format('0 %');
};

const formatTooltipValue = (coordinate: Coordinate) => {
  return isValidCoordinateValue(coordinate.y)
    ? asPercent(coordinate.y, 1)
    : NOT_AVAILABLE_LABEL;
};

const TransactionBreakdownGraph: React.FC<Props> = props => {
  const { timeseries } = props;

  return (
    <TransactionLineChart
      series={timeseries}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      yMax={1}
      height={unit * 12}
      stacked={true}
    />
  );
};

export { TransactionBreakdownGraph };
