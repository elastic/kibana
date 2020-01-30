/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  getAxisId,
  getSpecId,
  HistogramBarSeries,
  Position,
  Settings,
} from '@elastic/charts';
import React from 'react';
import { EuiProgress } from '@elastic/eui';
import areEqual from 'fast-deep-equal/react';

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

const MemoChart = React.memo(Chart, areEqual);
const MemoSettings = React.memo(Settings, areEqual);
const MemoAxis = React.memo(Axis, areEqual);
const MemoHistogramBarSeries = React.memo(HistogramBarSeries, areEqual);

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

        <MemoChart size={['100%', chartHeight]}>
          <MemoSettings
            legendPosition={legendPosition}
            onBrushEnd={updateDateRange}
            showLegend
            theme={theme}
          />

          <MemoAxis
            id={getAxisId('signalsHistogramAxisX')}
            position="bottom"
            tickFormat={histogramDateTimeFormatter([from, to])}
          />

          <MemoAxis id={getAxisId('signalsHistogramAxisY')} position="left" />

          <MemoHistogramBarSeries
            id={getSpecId('signalsHistogram')}
            xScaleType="time"
            yScaleType="linear"
            xAccessor="x"
            yAccessors={['y']}
            splitSeriesAccessors={['g']}
            data={data}
          />
        </MemoChart>
      </>
    );
  },
  areEqual
);
SignalsHistogram.displayName = 'SignalsHistogram';
