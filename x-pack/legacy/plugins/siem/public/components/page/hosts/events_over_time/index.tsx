/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { ScaleType, niceTimeFormatter, Position } from '@elastic/charts';

import { getOr, head, last } from 'lodash/fp';
import { EuiPanel, EuiLoadingContent, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { BarChart } from '../../../charts/barchart';
import { EventsOverTimeData } from '../../../../graphql/types';
import * as i18n from './translation';
import { HeaderPanel } from '../../../header_panel';
import { ChartSeriesData } from '../../../charts/common';

export const getBarchartConfigs = (from: number, to: number) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: niceTimeFormatter([from, to]),
    yTickFormatter: (value: string | number): string => value.toLocaleString(),
  },
  settings: {
    legendPosition: Position.Bottom,
    showLegend: true,
    theme: {
      scales: {
        barsPadding: 0.05,
      },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  },
});

const Panel = styled(EuiPanel)<{ loading: { loading: boolean } }>`
  height: 388px;
  position: relative;
  ${({ loading }) =>
    loading &&
    `
    overflow: hidden;
  `}
`;

const FlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

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

  const barChartData: ChartSeriesData[] = [
    {
      key: 'eventsOverTime',
      value: eventsOverTime,
    },
  ];
  return (
    <Panel
      data-test-subj="eventsOverTimePanel"
      loading={{ loading }}
      onMouseEnter={() => setShowInspect(true)}
      onMouseLeave={() => setShowInspect(false)}
    >
      <FlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <HeaderPanel
            id={id}
            title={i18n.EVENT_COUNT_FREQUENCY}
            showInspect={showInspect}
            subtitle={
              <>{`${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`}</>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {loading ? (
            <EuiLoadingContent data-test-subj="initialLoadingPanelEventsOverTime" lines={10} />
          ) : (
            <BarChart barChart={barChartData} configs={barchartConfigs} />
          )}
        </EuiFlexItem>
      </FlexGroup>
    </Panel>
  );
};
