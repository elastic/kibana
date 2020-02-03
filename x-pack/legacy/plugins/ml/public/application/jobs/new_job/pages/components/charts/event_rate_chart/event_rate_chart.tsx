/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { BarSeries, Chart, ScaleType, Settings, TooltipType } from '@elastic/charts';
import { Axes } from '../common/axes';
import { LineChartPoint } from '../../../../common/chart_loader';
import { Anomaly } from '../../../../common/results_loader';
import { EVENT_RATE_COLOR, EVENT_RATE_COLOR_WITH_ANOMALIES } from '../common/settings';
import { LoadingWrapper } from '../loading_wrapper';
import { Anomalies } from '../common/anomalies';

interface Props {
  eventRateChartData: LineChartPoint[];
  anomalyData?: Anomaly[];
  height: string;
  width: string;
  showAxis?: boolean;
  loading?: boolean;
  fadeChart?: boolean;
}

export const EventRateChart: FC<Props> = ({
  eventRateChartData,
  anomalyData,
  height,
  width,
  showAxis,
  loading = false,
  fadeChart,
}) => {
  const barColor = fadeChart ? EVENT_RATE_COLOR_WITH_ANOMALIES : EVENT_RATE_COLOR;

  return (
    <div
      style={{ width, height }}
      data-test-subj={`mlEventRateChart ${eventRateChartData.length ? 'withData' : 'empty'}`}
    >
      <LoadingWrapper height={height} hasData={eventRateChartData.length > 0} loading={loading}>
        <Chart>
          {showAxis === true && <Axes />}

          <Settings tooltip={TooltipType.None} />
          <Anomalies anomalyData={anomalyData} />
          <BarSeries
            id="event_rate"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={'time'}
            yAccessors={['value']}
            data={eventRateChartData}
            customSeriesColors={[barColor]}
          />
        </Chart>
      </LoadingWrapper>
    </div>
  );
};
