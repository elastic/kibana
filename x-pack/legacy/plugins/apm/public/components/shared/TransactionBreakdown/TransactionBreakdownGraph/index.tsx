/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import numeral from '@elastic/numeral';
import { throttle } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { Maybe } from '../../../../../typings/common';
import { TransactionLineChart } from '../../charts/TransactionCharts/TransactionLineChart';
import { asPercent } from '../../../../utils/formatters';
import { unit } from '../../../../style/variables';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { trackEvent } from '../../../../../../infra/public/hooks/use_track_metric';

interface Props {
  timeseries: TimeSeries[];
}

const tickFormatY = (y: Maybe<number>) => {
  return numeral(y || 0).format('0 %');
};

const formatTooltipValue = (coordinate: Coordinate) => {
  return isValidCoordinateValue(coordinate.y)
    ? asPercent(coordinate.y, 1)
    : NOT_AVAILABLE_LABEL;
};

const trackHoverBreakdownChart = throttle(
  () => trackEvent({ app: 'apm', name: 'hover_breakdown_chart' }),
  60000
);

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
      onHover={trackHoverBreakdownChart}
    />
  );
};

export { TransactionBreakdownGraph };
