/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { ScaleType, niceTimeFormatter } from '@elastic/charts';

import { getOr, head, last } from 'lodash/fp';
import { BarChart } from '../../../charts/barchart';
import { EventsOverTimeData } from '../../../../graphql/types';
import { LoadingPanel } from '../../../loading';
import * as i18n from './translation';
import { HeaderPanel } from '../../../header_panel';
import { ChartSeriesData } from '../../../charts/common';

const loadingPanelHeight = '274px';
export const getBarchartConfigs = (from: number, to: number) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: niceTimeFormatter([from, to]),
    yTickFormatter: (value: string | number): string => value.toLocaleString(),
  },
});

export const EventsOverTimeHistogram = ({
  id,
  loading,
  data,
  startDate,
  endDate,
}: {
  id: string;
  data: EventsOverTimeData;
  loading: boolean;
  startDate: number;
  endDate: number;
}) => {
  const eventsOverTime = getOr([], 'eventsOverTime', data);
  const totalCount = getOr(0, 'totalCount', data);
  const bucketStartDate = getOr(startDate, 'x', head(eventsOverTime));
  const bucketEndDate = getOr(endDate, 'x', last(eventsOverTime));
  const barchartConfigs = getBarchartConfigs(bucketStartDate!, bucketEndDate!);
  const [showInspect, setShowInspect] = useState(false);
  const onChartHover = () => {
    setShowInspect(!showInspect);
  };
  const barChartData: ChartSeriesData[] = [
    {
      key: 'eventsOverTime',
      value: eventsOverTime,
    },
  ];
  return (
    <>
      <HeaderPanel
        id={id}
        title={i18n.EVENT_COUNT_FREQUENCY}
        showInspect={showInspect}
        subtitle={<>{`${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`}</>}
      />
      {loading ? (
        <LoadingPanel
          text={i18n.LOADING_EVENTS_OVER_TIME}
          height={loadingPanelHeight}
          width="100%"
        />
      ) : (
        <div onMouseOver={onChartHover} onFocus={onChartHover}>
          <BarChart barChart={barChartData} configs={barchartConfigs} />
        </div>
      )}
    </>
  );
};
