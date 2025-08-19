/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import type { PartialTheme } from '@elastic/charts';
import { Chart, BarSeries, ScaleType, Settings, Tooltip, TooltipType } from '@elastic/charts';
import { useEuiTheme, EuiLoadingChart, EuiTextColor } from '@elastic/eui';

import { useLogRateAnalysisBarColors } from '@kbn/aiops-log-rate-analysis';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SignificantItemHistogramItem } from '@kbn/ml-agg-utils';
import { i18n } from '@kbn/i18n';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

interface MiniHistogramProps {
  chartData?: SignificantItemHistogramItem[];
  isLoading: boolean;
  label: string;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
}

export const MiniHistogram: FC<MiniHistogramProps> = ({
  chartData,
  isLoading,
  label,
  barColorOverride,
  barHighlightColorOverride,
}) => {
  const { charts } = useAiopsAppContext();

  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const barColors = useLogRateAnalysisBarColors();

  const miniHistogramChartTheme: PartialTheme = {
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
    scales: {
      barsPadding: 0.1,
    },
    background: {
      color: 'transparent',
    },
  };

  const cssChartSize = css({
    width: '80px',
    height: euiTheme.size.l,
    margin: '0px',
  });

  const cssCenter = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  if (isLoading) {
    return (
      <div css={[cssChartSize, cssCenter]}>
        <EuiLoadingChart />
      </div>
    );
  }

  if (!chartData) {
    return (
      <div css={[cssChartSize, cssCenter]}>
        <EuiTextColor color="subdued">
          <FormattedMessage id="xpack.aiops.miniHistogram.noDataLabel" defaultMessage="N/A" />
        </EuiTextColor>
      </div>
    );
  }

  const barColor = barColorOverride ? [barColorOverride] : barColors.barColor;
  const barHighlightColor = barHighlightColorOverride
    ? [barHighlightColorOverride]
    : [barColors.barHighlightColor];

  return (
    <div css={cssChartSize}>
      <Chart>
        <Tooltip type={TooltipType.None} />
        <Settings
          theme={[miniHistogramChartTheme]}
          baseTheme={chartBaseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
        />
        <BarSeries
          id="doc_count_overall"
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['doc_count_overall']}
          data={chartData}
          stackAccessors={[0]}
          color={barColor}
        />
        <BarSeries
          id={label}
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['doc_count_significant_item']}
          data={chartData}
          stackAccessors={[0]}
          color={barHighlightColor}
        />
      </Chart>
    </div>
  );
};
