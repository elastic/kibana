/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { MetricDistributionChart, buildChartDataFromStats } from '../metric_distribution_chart';
import type { FieldVisConfig } from '../../types';
import { kibanaFieldFormat, formatSingleValue } from '../../../utils';

const METRIC_DISTRIBUTION_CHART_WIDTH = 100;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 10;

export interface NumberContentPreviewProps {
  config: FieldVisConfig;
}

export const IndexBasedNumberContentPreview: FC<NumberContentPreviewProps> = ({ config }) => {
  const { stats, fieldFormat, fieldName } = config;
  const dataTestSubj = `dataVisualizerDataGridChart-${fieldName}`;

  const distributionChartData = useMemo(
    () => buildChartDataFromStats(stats?.distribution, METRIC_DISTRIBUTION_CHART_WIDTH),
    [stats?.distribution]
  );

  const legendText = useMemo(
    () =>
      Array.isArray(distributionChartData) &&
      distributionChartData[0].x !== undefined &&
      distributionChartData[distributionChartData.length - 1].x !== undefined
        ? {
            min: formatSingleValue(distributionChartData[0].x),
            max: formatSingleValue(distributionChartData[distributionChartData.length - 1].x),
          }
        : '',
    [distributionChartData]
  );

  return (
    <div data-test-subj={dataTestSubj} style={{ width: '100%' }}>
      <div className="dataGridChart__histogram" data-test-subj={`${dataTestSubj}-histogram`}>
        <MetricDistributionChart
          width={METRIC_DISTRIBUTION_CHART_WIDTH}
          height={METRIC_DISTRIBUTION_CHART_HEIGHT}
          chartData={distributionChartData}
          fieldFormat={fieldFormat}
          hideXAxis={true}
        />
      </div>
      <div className={'dataGridChart__legend'} data-test-subj={`${dataTestSubj}-legend`}>
        {legendText && (
          <>
            <EuiFlexGroup
              direction={'row'}
              data-test-subj={`${dataTestSubj}-legend`}
              responsive={false}
              gutterSize="m"
            >
              <EuiFlexItem
                className={'dataGridChart__legend'}
                style={{ maxWidth: METRIC_DISTRIBUTION_CHART_WIDTH * 0.75 }}
              >
                {kibanaFieldFormat(legendText.min, fieldFormat)}
              </EuiFlexItem>
              <EuiFlexItem className={'dataGridChart__legend'}>
                {kibanaFieldFormat(legendText.max, fieldFormat)}
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </div>
    </div>
  );
};
