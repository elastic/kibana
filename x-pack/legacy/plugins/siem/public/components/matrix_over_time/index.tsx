/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { ScaleType, niceTimeFormatter, Position } from '@elastic/charts';

import { getOr, head, last } from 'lodash/fp';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiPanel, EuiLoadingContent } from '@elastic/eui';
import styled from 'styled-components';
import { BarChart } from '../charts/barchart';
import { HeaderPanel } from '../header_panel';
import { ChartSeriesData, UpdateDateRange } from '../charts/common';
import { MatrixOverTimeHistogramData } from '../../graphql/types';
import { DEFAULT_DARK_MODE } from '../../../common/constants';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { Loader } from '../loader';

export interface MatrixOverTimeBasicProps {
  id: string;
  data: MatrixOverTimeHistogramData[];
  loading: boolean;
  startDate: number;
  endDate: number;
  updateDateRange: UpdateDateRange;
  totalCount: number;
}

export interface MatrixOverTimeProps extends MatrixOverTimeBasicProps {
  title: string;
  subtitle: string;
  dataKey: string;
}

const getBarchartConfigs = (from: number, to: number, onBrushEnd: UpdateDateRange) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: niceTimeFormatter([from, to]),
    yTickFormatter: (value: string | number): string => value.toLocaleString(),
    tickSize: 8,
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
  customHeight: 324,
});

const Panel = styled(EuiPanel)<{ loading: number }>`
  position: relative;

  ${({ loading }) =>
    loading &&
    `
    overflow: hidden;`}
`;

export const MatrixOverTimeHistogram = ({
  id,
  loading,
  data,
  dataKey,
  endDate,
  updateDateRange,
  startDate,
  title,
  subtitle,
  totalCount,
}: MatrixOverTimeProps) => {
  const bucketStartDate = getOr(startDate, 'x', head(data));
  const bucketEndDate = getOr(endDate, 'x', last(data));
  const barchartConfigs = getBarchartConfigs(bucketStartDate!, bucketEndDate!, updateDateRange);
  const [showInspect, setShowInspect] = useState(false);
  const [darkMode] = useKibanaUiSetting(DEFAULT_DARK_MODE);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const barChartData: ChartSeriesData[] = [
    {
      key: dataKey,
      value: data,
    },
  ];

  useEffect(() => {
    if (totalCount >= 0 && loadingInitial) {
      setLoadingInitial(false);
    }
  }, [totalCount, showInspect]);

  return (
    <Panel
      data-test-subj={`${dataKey}Panel`}
      loading={loading ? 1 : 0}
      onMouseEnter={() => setShowInspect(true)}
      onMouseLeave={() => setShowInspect(false)}
    >
      <HeaderPanel
        id={id}
        title={title}
        showInspect={!loadingInitial && showInspect}
        subtitle={!loadingInitial && subtitle}
      />

      {loadingInitial ? (
        <EuiLoadingContent data-test-subj="initialLoadingPanelMatrixOverTime" lines={10} />
      ) : (
        <>
          <BarChart barChart={barChartData} configs={barchartConfigs} />

          {loading && (
            <Loader
              overlay
              overlayBackground={
                darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
              }
              size="xl"
            />
          )}
        </>
      )}
    </Panel>
  );
};
