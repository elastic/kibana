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
import { BarChart } from '../charts/barchart';
import { HeaderPanel } from '../header_panel';
import { ChartSeriesData, UpdateDateRange } from '../charts/common';
import { MatrixOverTimeHistogramData } from '../../graphql/types';

const getBarchartConfigs = (from: number, to: number, onBrushEnd: UpdateDateRange) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: niceTimeFormatter([from, to]),
    yTickFormatter: (value: string | number): string => value.toLocaleString(),
  },
  settings: {
    legendPosition: Position.Bottom,
    onBrushEnd,
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

export const MatrixOverTimeHistogram = ({
  id,
  loading,
  data,
  dataKey,
  endDate,
  narrowDateRange,
  startDate,
  title,
  subtitle,
}: {
  id: string;
  data: MatrixOverTimeHistogramData[];
  dataKey: string;
  loading: boolean;
  startDate: number;
  endDate: number;
  narrowDateRange: UpdateDateRange;
  title: string;
  subtitle: string;
}) => {
  const bucketStartDate = getOr(startDate, 'x', head(data));
  const bucketEndDate = getOr(endDate, 'x', last(data));
  const barchartConfigs = getBarchartConfigs(bucketStartDate!, bucketEndDate!, narrowDateRange);
  const [showInspect, setShowInspect] = useState(false);

  const barChartData: ChartSeriesData[] = [
    {
      key: dataKey,
      value: data,
    },
  ];
  return (
    <Panel
      data-test-subj={`${dataKey}Panel`}
      loading={{ loading }}
      onMouseEnter={() => setShowInspect(true)}
      onMouseLeave={() => setShowInspect(false)}
    >
      <FlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <HeaderPanel id={id} title={title} showInspect={showInspect} subtitle={subtitle} />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          {loading ? (
            <EuiLoadingContent data-test-subj={`initialLoadingPanel${dataKey}`} lines={10} />
          ) : (
            <BarChart barChart={barChartData} configs={barchartConfigs} />
          )}
        </EuiFlexItem>
      </FlexGroup>
    </Panel>
  );
};
