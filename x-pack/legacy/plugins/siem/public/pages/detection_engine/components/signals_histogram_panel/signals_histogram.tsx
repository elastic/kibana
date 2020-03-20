/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  Settings,
  ChartSizeArray,
} from '@elastic/charts';
import React, { useMemo } from 'react';
import { EuiProgress } from '@elastic/eui';

import { useTheme } from '../../../../components/charts/common';
import { histogramDateTimeFormatter } from '../../../../components/utils';
import { HistogramData } from './types';

const DEFAULT_CHART_HEIGHT = 174;

interface HistogramSignalsProps {
  chartHeight?: number;
  from: number;
  legendPosition?: Position;
  loading: boolean;
  to: number;
  data: HistogramData[];
  updateDateRange: (min: number, max: number) => void;
}

export const SignalsHistogram = React.memo<HistogramSignalsProps>(
  ({
    chartHeight = DEFAULT_CHART_HEIGHT,
    data,
    from,
    legendPosition = 'right',
    loading,
    to,
    updateDateRange,
  }) => {
    const theme = useTheme();

    const chartSize: ChartSizeArray = useMemo(() => ['100%', chartHeight], [chartHeight]);
    const xAxisId = 'signalsHistogramAxisX';
    const yAxisId = 'signalsHistogramAxisY';
    const id = 'signalsHistogram';
    const yAccessors = useMemo(() => ['y'], []);
    const splitSeriesAccessors = useMemo(() => ['g'], []);
    const tickFormat = useMemo(() => histogramDateTimeFormatter([from, to]), [from, to]);

    return (
      <>
        {loading && (
          <EuiProgress
            data-test-subj="loadingPanelSignalsHistogram"
            size="xs"
            position="absolute"
            color="accent"
          />
        )}

        <Chart size={chartSize}>
          <Settings
            legendPosition={legendPosition}
            onBrushEnd={updateDateRange}
            showLegend
            showLegendExtra
            theme={theme}
          />

          <Axis id={xAxisId} position="bottom" tickFormat={tickFormat} />

          <Axis id={yAxisId} position="left" />

          <HistogramBarSeries
            id={id}
            xScaleType="time"
            yScaleType="linear"
            xAccessor="x"
            yAccessors={yAccessors}
            splitSeriesAccessors={splitSeriesAccessors}
            data={data}
          />
        </Chart>
      </>
    );
  }
);

SignalsHistogram.displayName = 'SignalsHistogram';
