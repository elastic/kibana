/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  BrushEndListener,
  ElementClickListener,
  XYChartElementEvent,
  XYBrushEvent,
} from '@elastic/charts';
import { Axis, HistogramBarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import moment from 'moment';
import { getTimeZone } from '@kbn/visualization-utils';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import type { LogRateHistogramItem } from '@kbn/aiops-log-rate-analysis';

import { EuiFlexGroup, EuiLoadingSpinner, EuiFlexItem } from '@elastic/eui';
import { useDataVisualizerKibana } from '../../../../kibana_context';

interface Props {
  width?: number;
  chartPoints: LogRateHistogramItem[];
  timeRangeEarliest: number;
  timeRangeLatest: number;
  interval?: number;
  loading: boolean;
}

const SPEC_ID = 'document_count';

export function LoadingSpinner() {
  return (
    <EuiFlexItem style={{ alignItems: 'center' }}>
      <EuiLoadingSpinner size="l" data-test-subj="loadingSpinner" />
    </EuiFlexItem>
  );
}

export const DocumentCountChart: FC<Props> = ({
  width,
  chartPoints,
  timeRangeEarliest,
  timeRangeLatest,
  interval,
  loading,
}) => {
  const {
    services: { data, uiSettings, fieldFormats, charts },
  } = useDataVisualizerKibana();

  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
  const useLegacyTimeAxis = uiSettings.get('visualization:useLegacyTimeAxis', false);

  const seriesName = i18n.translate(
    'xpack.dataVisualizer.dataGrid.field.documentCountChart.seriesLabel',
    {
      defaultMessage: 'document count',
    }
  );

  const adjustedChartPoints = useMemo(() => {
    // Display empty chart when no data in range
    if (chartPoints.length < 1) return [{ time: timeRangeEarliest, value: 0 }];

    // If chart has only one bucket
    // it won't show up correctly unless we add an extra data point
    if (chartPoints.length === 1) {
      return [
        ...chartPoints,
        { time: interval ? Number(chartPoints[0].time) + interval : timeRangeEarliest, value: 0 },
      ];
    }
    return chartPoints;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPoints, timeRangeEarliest, timeRangeLatest, interval]);

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const onBrushEnd = ({ x }: XYBrushEvent) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    timefilterUpdateHandler({ from, to });
  };

  const onElementClick: ElementClickListener = ([elementData]) => {
    const startRange = (elementData as XYChartElementEvent)[0].x;

    const range = {
      from: startRange,
      to: startRange + interval,
    };
    timefilterUpdateHandler(range);
  };

  const timeZone = getTimeZone(uiSettings);

  return (
    <EuiFlexGroup
      alignItems="center"
      css={{ width: width ?? '100%' }}
      data-test-subj="dataVisualizerDocumentCountChart"
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Chart
          size={{
            width: '100%',
            height: 120,
          }}
        >
          <Settings
            onBrushEnd={onBrushEnd as BrushEndListener}
            onElementClick={onElementClick}
            baseTheme={chartBaseTheme}
            locale={i18n.getLocale()}
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={(value) => xAxisFormatter.convert(value)}
            // temporary fix to reduce horizontal chart margin until fixed in Elastic Charts itself
            labelFormat={useLegacyTimeAxis ? undefined : () => ''}
            timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
            style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
          />
          <Axis id="left" position={Position.Left} />
          <HistogramBarSeries
            id={SPEC_ID}
            name={seriesName}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="time"
            yAccessors={['value']}
            data={adjustedChartPoints}
            timeZone={timeZone}
            yNice
          />
        </Chart>
      )}
    </EuiFlexGroup>
  );
};
