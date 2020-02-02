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
import React, { useMemo } from 'react';
import { EuiProgress } from '@elastic/eui';
import deepEqual from 'fast-deep-equal/react';
import memoizeOne from 'memoize-one';

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

const MemoChart = React.memo(Chart, deepEqual);
const MemoSettings = React.memo(Settings, deepEqual);
const MemoHistogramBarSeries = React.memo(HistogramBarSeries, deepEqual);
const MemoAxis = React.memo(Axis, deepEqual);

const SignalsHistogramComponent: React.FC<HistogramSignalsProps> = ({
  chartHeight = DEFAULT_CHART_HEIGHT,
  data,
  from,
  legendPosition = 'right',
  loading,
  to,
  updateDateRange,
}) => {
  const theme = useTheme();

  const chartSize = useMemo(() => ['100%', chartHeight], [chartHeight]);
  const xAxisId = useMemo(() => getAxisId('signalsHistogramAxisX'), []);
  const yAxisId = useMemo(() => getAxisId('signalsHistogramAxisY'), []);
  const id = useMemo(() => getSpecId('signalsHistogram'), []);
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

      <MemoChart size={chartSize}>
        <MemoSettings
          legendPosition={legendPosition}
          onBrushEnd={updateDateRange}
          showLegend
          theme={theme}
        />

        <MemoAxis id={xAxisId} position="bottom" tickFormat={tickFormat} />

        <MemoAxis id={yAxisId} position="left" />

        <MemoHistogramBarSeries
          id={id}
          xScaleType="time"
          yScaleType="linear"
          xAccessor="x"
          yAccessors={yAccessors}
          splitSeriesAccessors={splitSeriesAccessors}
          data={data}
        />
      </MemoChart>
    </>
  );
};

export const SignalsHistogram = React.memo(SignalsHistogramComponent, deepEqual);
