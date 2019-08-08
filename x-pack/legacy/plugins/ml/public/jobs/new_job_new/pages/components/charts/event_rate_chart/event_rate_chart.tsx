/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { BarSeries, Chart, getSpecId, ScaleType, Settings, TooltipType } from '@elastic/charts';
import { Axes } from '../common/axes';
import { getCustomColor } from '../common/utils';
import { LineChartPoint } from '../../../../common/chart_loader';
import { EVENT_RATE_COLOR } from '../common/settings';

interface Props {
  eventRateChartData: LineChartPoint[];
  height: string;
  width: string;
  showAxis?: boolean;
}

const SPEC_ID = 'event_rate';

export const EventRateChart: FC<Props> = ({ eventRateChartData, height, width, showAxis }) => {
  return (
    <div style={{ width, height }} data-test-subj="mlEventRateChart">
      <Chart>
        {showAxis === true && <Axes />}

        <Settings tooltip={TooltipType.None} />
        <BarSeries
          id={getSpecId('event_rate')}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'time'}
          yAccessors={['value']}
          data={eventRateChartData}
          customSeriesColors={getCustomColor(SPEC_ID, EVENT_RATE_COLOR)}
        />
      </Chart>
    </div>
  );
};
