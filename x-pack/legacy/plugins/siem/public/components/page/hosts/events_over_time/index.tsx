/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ScaleType, niceTimeFormatter } from '@elastic/charts';

import { getOr, head, last } from 'lodash/fp';
import { BarChart } from '../../../charts/barchart';
import { ChartData } from '../../../charts/common';
import { EventsOverTimeData } from '../../../../graphql/types';
import { LoadingPanel } from '../../../loading';
import * as i18n from './translation';
import { HeaderPanel } from '../../../header_panel';

const loadingPanelHeight = '274px';
export const getBarchartConfigs = (from: number, to: number) => ({
  settings: {
    rotation: 0,
  },
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: niceTimeFormatter([from, to]),
    yTickFormatter: (value: string | number): string => value.toLocaleString(),
  },
});

export const EventsOverTimeHistogram = React.memo<{
  data: EventsOverTimeData | null | undefined;
  loading: boolean;
  startDate: number;
  endDate: number;
}>(({ loading, data, startDate, endDate }) => {
  const eventsOverTime = getOr([], `eventsOverTime`, data);
  const totalCount = getOr(0, `totalCount`, data);
  const bucketStartDate = getOr(startDate, 'key', head(eventsOverTime));
  const bucketEndDate = getOr(endDate, 'key', last(eventsOverTime));
  const barchartConfigs = getBarchartConfigs(bucketStartDate!, bucketEndDate!);
  const barChartData = [
    {
      key: 'eventsOverTime',
      value: eventsOverTime as ChartData[],
    },
  ];
  // console.log('eventstime', loading, JSON.stringify(barChartData));
  return (
    <>
      <HeaderPanel
        title={i18n.EVENTS}
        subtitle={<>{`${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`}</>}
      />
      {loading ? (
        <LoadingPanel
          text={i18n.LOADING_EVENTS_OVER_TIME}
          height={loadingPanelHeight}
          width="100%"
        />
      ) : (
        <BarChart barChart={barChartData} configs={barchartConfigs} />
      )}
    </>
  );
});
