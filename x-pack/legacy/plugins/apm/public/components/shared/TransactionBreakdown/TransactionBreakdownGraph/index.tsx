/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
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

const TransactionBreakdownGraph: React.FC<Props> = props => {
  const { timeseries } = props;

  const series: React.ComponentProps<
    typeof TransactionLineChart
  >['series'] = useMemo(() => {
    return timeseries.map(timeseriesConfig => {
      return {
        ...timeseriesConfig,
        // convert null into undefined because of stack issues,
        // see https://github.com/uber/react-vis/issues/1214
        data: timeseriesConfig.data.map(value => {
          return 'y' in value && isValidCoordinateValue(value.y)
            ? value
            : {
                ...value,
                y: undefined
              };
        })
      };
    }, {});
  }, [timeseries]);

  const tickFormatY = useCallback((y: number | null | undefined) => {
    return numeral(y || 0).format('0 %');
  }, []);

  const formatTooltipValue = useCallback((coordinate: Coordinate) => {
    return isValidCoordinateValue(coordinate.y)
      ? asPercent(coordinate.y, 1)
      : NOT_AVAILABLE_LABEL;
  }, []);

  return (
    <TransactionLineChart
      series={series}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      yMax={1}
      height={unit * 12}
      stacked={true}
    />
  );
};

export { TransactionBreakdownGraph };
