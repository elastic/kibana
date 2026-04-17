/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipStickTo,
  niceTimeFormatter,
} from '@elastic/charts';
import type { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  formatNumber,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React, { useCallback, useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import {
  STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  useStreamDocCountsFetch,
} from '../../hooks/use_streams_doc_counts_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { ChartEmbeddedSideStats } from './chart_embedded_stats';

const CHART_HEIGHT = 150;

function getChartTimeZone(uiSettings: IUiSettingsClient) {
  const kibanaTimeZone = uiSettings.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
  if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
    return 'local';
  }
  return kibanaTimeZone;
}

export function IngestRateChart() {
  const { definition } = useStreamDetail();

  if (!definition) {
    return null;
  }

  return <IngestRateChartContent definition={definition} />;
}

function IngestRateChartContent({ definition }: { definition: Streams.all.GetResponse }) {
  const {
    core: { uiSettings },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const barSeriesTimeZone = useMemo(() => getChartTimeZone(uiSettings), [uiSettings]);

  const canReadFailureStore = Streams.ingest.all.GetResponse.is(definition)
    ? definition.privileges.read_failure_store
    : false;
  const streamName = definition.stream.name;
  const isQueryStream = Streams.QueryStream.GetResponse.is(definition);

  const esqlSource = isQueryStream ? definition.stream.query.view : streamName;

  const { timeState } = useTimefilter();
  const minInterval = Math.floor(
    (timeState.end - timeState.start) / STREAMS_HISTOGRAM_NUM_DATA_POINTS
  );
  const xFormatter = niceTimeFormatter([timeState.start, timeState.end]);

  const { getStreamHistogram } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    canReadFailureStore,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  });

  const histogramFetch = getStreamHistogram(esqlSource);
  const histogramResult = useAsync(() => histogramFetch, [histogramFetch]);

  const allTimeseries = useMemo(
    () =>
      esqlResultToTimeseries({
        result: histogramResult,
        metricNames: ['doc_count'],
      }),
    [histogramResult]
  );

  const docCountInRange = useMemo(
    () =>
      allTimeseries.reduce(
        (acc, series) => acc + series.data.reduce((sum, item) => sum + (item.doc_count ?? 0), 0),
        0
      ),
    [allTimeseries]
  );

  const { updateTimeRange } = useTimeRangeUpdate();
  const onBrushEnd = useCallback<BrushEndListener>(
    (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (!x) return;
      const [min, max] = x;
      updateTimeRange({
        from: new Date(min).toISOString(),
        to: new Date(max).toISOString(),
      });
    },
    [updateTimeRange]
  );

  const documentsSeriesName = i18n.translate(
    'xpack.streams.streamOverview.timeSeriesChart.legend.documents',
    { defaultMessage: 'Documents' }
  );

  const chartHeaderCountDisplay =
    histogramResult.loading && !histogramResult.value
      ? '—'
      : histogramResult.error
      ? '—'
      : formatNumber(docCountInRange, '0,0');

  const chartHeaderTitle = i18n.translate(
    'xpack.streams.streamOverview.timeSeriesChart.headerTitle',
    {
      defaultMessage: 'Documents ({count})',
      values: { count: chartHeaderCountDisplay },
    }
  );

  const chartHeaderSubtitle = i18n.translate(
    'xpack.streams.streamOverview.timeSeriesChart.headerSubtitle',
    {
      defaultMessage: 'For selected time-range',
    }
  );

  const chartHeader = (
    <div data-test-subj="streamsAppStreamOverviewChartHeader">
      <EuiTitle size="s">
        <h3>{chartHeaderTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {chartHeaderSubtitle}
      </EuiText>
    </div>
  );

  const chartColumnCss = useMemo(
    () =>
      css({
        alignSelf: 'flex-start',
        minWidth: 0,
        width: '100%',
      }),
    []
  );

  return (
    <EuiPanel hasBorder paddingSize="m">
      {chartHeader}
      <EuiSpacer size="m" />

      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="l"
        responsive
        wrap
        data-test-subj="streamsAppStreamOverviewChartRow"
      >
        <EuiFlexItem grow css={chartColumnCss}>
          <div data-test-subj="streamsAppStreamOverviewChartPlotColumn">
            {histogramResult.loading && !histogramResult.value ? (
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                style={{ height: CHART_HEIGHT }}
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingChart size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <Chart
                id={`streams-ingest-rate-${streamName}`}
                size={{ width: '100%', height: CHART_HEIGHT }}
              >
                <Settings
                  showLegend={false}
                  legendPosition={Position.Bottom}
                  xDomain={{ min: timeState.start, max: timeState.end, minInterval }}
                  locale={i18n.getLocale()}
                  baseTheme={chartBaseTheme}
                  theme={{ barSeriesStyle: { rect: { widthRatio: 0.6 } } }}
                  onBrushEnd={onBrushEnd}
                  allowBrushingLastHistogramBin
                />
                <Tooltip
                  stickTo={TooltipStickTo.Top}
                  headerFormatter={({ value }) => xFormatter(value)}
                />
                <Axis
                  id="x-axis"
                  position={Position.Bottom}
                  showOverlappingTicks
                  tickFormat={xFormatter}
                  gridLine={{ visible: false }}
                />
                <Axis
                  id="y-axis"
                  ticks={3}
                  position={Position.Left}
                  tickFormat={(value) => (value === null ? '' : String(value))}
                />
                {allTimeseries.map((serie) => (
                  <BarSeries
                    key={serie.id}
                    id={serie.id}
                    timeZone={barSeriesTimeZone}
                    name={documentsSeriesName}
                    color={euiTheme.colors.success}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['doc_count']}
                    data={serie.data}
                    enableHistogramMode
                  />
                ))}
              </Chart>
            )}
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              wrap={false}
              data-test-subj="streamsAppStreamOverviewChartLegend"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.streams.streamOverview.timeSeriesChart.rangeLegendPrefix',
                    {
                      defaultMessage: 'For the selected time-range',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span
                  aria-hidden
                  css={{
                    width: euiTheme.size.s,
                    height: euiTheme.size.s,
                    borderRadius: '50%',
                    backgroundColor: euiTheme.colors.success,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {documentsSeriesName}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiFlexItem>
        <ChartEmbeddedSideStats
          definition={definition}
          esqlSource={esqlSource}
          statsHistogramResult={histogramResult}
          docCountInRange={docCountInRange}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
