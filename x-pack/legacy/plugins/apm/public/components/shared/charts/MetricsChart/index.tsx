/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { GenericMetricsChart } from '../../../../../server/lib/metrics/transform_metrics_chart';
// @ts-ignore
import CustomPlot from '../CustomPlot';
import {
  asDecimal,
  asPercent,
  asInteger,
  asDynamicBytes,
  getFixedByteFormatter,
  asDuration
} from '../../../../utils/formatters';
import { Coordinate } from '../../../../../typings/timeseries';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { useChartsSync } from '../../../../hooks/useChartsSync';
import { Maybe } from '../../../../../typings/common';

interface Props {
  start: Maybe<number | string>;
  end: Maybe<number | string>;
  chart: GenericMetricsChart;
}

export function MetricsChart({ chart }: Props) {
  const formatYValue = getYTickFormatter(chart);
  const formatTooltip = getTooltipFormatter(chart);

  const transformedSeries = chart.series.map(series => ({
    ...series,
    legendValue: formatYValue(series.overallValue)
  }));

  const syncedChartProps = useChartsSync();

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <span>{chart.title}</span>
      </EuiTitle>
      <CustomPlot
        {...syncedChartProps}
        series={transformedSeries}
        tickFormatY={formatYValue}
        formatTooltipValue={formatTooltip}
        yMax={chart.yUnit === 'percent' ? 1 : 'max'}
      />
    </React.Fragment>
  );
}

function getYTickFormatter(chart: GenericMetricsChart) {
  switch (chart.yUnit) {
    case 'bytes': {
      const max = Math.max(
        ...chart.series.flatMap(series =>
          series.data.map(coord => coord.y || 0)
        )
      );
      return getFixedByteFormatter(max);
    }
    case 'percent': {
      return (y: Maybe<number>) => asPercent(y || 0, 1);
    }
    case 'time': {
      return (y: Maybe<number>) => asDuration(y);
    }
    case 'integer': {
      return (y: Maybe<number>) =>
        isValidCoordinateValue(y) ? asInteger(y) : y;
    }
    default: {
      return (y: Maybe<number>) =>
        isValidCoordinateValue(y) ? asDecimal(y) : y;
    }
  }
}

function getTooltipFormatter({ yUnit }: GenericMetricsChart) {
  switch (yUnit) {
    case 'bytes': {
      return (c: Coordinate) => asDynamicBytes(c.y);
    }
    case 'percent': {
      return (c: Coordinate) => asPercent(c.y || 0, 1);
    }
    case 'time': {
      return (c: Coordinate) => asDuration(c.y);
    }
    case 'integer': {
      return (c: Coordinate) =>
        isValidCoordinateValue(c.y) ? asInteger(c.y) : c.y;
    }
    default: {
      return (c: Coordinate) =>
        isValidCoordinateValue(c.y) ? asDecimal(c.y) : c.y;
    }
  }
}
