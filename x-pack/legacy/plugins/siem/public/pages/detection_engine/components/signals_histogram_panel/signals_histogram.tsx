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

        <Chart size={['100%', chartHeight]}>
          <Settings
            legendPosition={legendPosition}
            onBrushEnd={updateDateRange}
            showLegend
            theme={theme}
          />

          <Axis
            id={getAxisId('signalsHistogramAxisX')}
            position="bottom"
            tickFormat={histogramDateTimeFormatter([from, to])}
          />

          <Axis id={getAxisId('signalsHistogramAxisY')} position="left" />

          <HistogramBarSeries
            id={getSpecId('signalsHistogram')}
            xScaleType="time"
            yScaleType="linear"
            xAccessor="x"
            yAccessors={['y']}
            splitSeriesAccessors={['g']}
            data={data}
          />
        </Chart>
      </>
    );
  }
);
SignalsHistogram.displayName = 'SignalsHistogram';
