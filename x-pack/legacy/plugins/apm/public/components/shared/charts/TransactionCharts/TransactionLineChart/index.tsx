/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { flatten } from 'lodash';
import d3 from 'd3';
import {
  Coordinate,
  RectCoordinate
} from '../../../../../../typings/timeseries';
import { useChartsTime } from '../../../../../hooks/useChartsTime';
import { getEmptySeries } from '../../CustomPlot/getEmptySeries';
// @ts-ignore
import CustomPlot from '../../CustomPlot';
import { toQuery, fromQuery } from '../../../Links/url_helpers';
import { history } from '../../../../../utils/history';

interface Props {
  series: Array<{
    color: string;
    title: React.ReactNode;
    titleShort?: React.ReactNode;
    data: Array<Coordinate | RectCoordinate>;
    type: string;
  }>;
  stacked?: boolean;
  truncateLegends?: boolean;
  tickFormatY: (y: number | null) => React.ReactNode;
  formatTooltipValue: (c: Coordinate) => React.ReactNode;
  yMax?: string | number;
  height?: number;
}

const TransactionLineChart: React.FC<Props> = (props: Props) => {
  const {
    series,
    tickFormatY,
    formatTooltipValue,
    stacked = false,
    yMax = 'max',
    height,
    truncateLegends
  } = props;

  const flattenedCoordinates = flatten(series.map(serie => serie.data));

  const start = d3.min(flattenedCoordinates, d => d.x);
  const end = d3.max(flattenedCoordinates, d => d.x);

  const noHits = series.every(
    serie =>
      serie.data.filter(value => 'y' in value && value.y !== null).length === 0
  );
  const { time, setTime } = useChartsTime();

  const hoverXHandlers = useMemo(
    () => {
      return {
        onHover: (hoverX: number) => {
          setTime(hoverX);
        },
        onMouseLeave: () => {
          setTime(null);
        },
        onSelectionEnd: (range: { start: number; end: number }) => {
          setTime(null);

          const currentSearch = toQuery(history.location.search);
          const nextSearch = {
            rangeFrom: new Date(range.start).toISOString(),
            rangeTo: new Date(range.end).toISOString()
          };

          history.push({
            ...history.location,
            search: fromQuery({
              ...currentSearch,
              ...nextSearch
            })
          });
        },
        hoverX: time
      };
    },
    [time, setTime]
  );

  if (!start || !end) {
    return null;
  }

  return (
    <CustomPlot
      noHits={noHits}
      series={noHits ? getEmptySeries(start, end) : series}
      start={new Date(start).getTime()}
      end={new Date(end).getTime()}
      {...hoverXHandlers}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      stacked={stacked}
      yMax={yMax}
      height={height}
      truncateLegends={truncateLegends}
    />
  );
};

export { TransactionLineChart };
