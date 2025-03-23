/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { capitalize } from 'lodash';
import { TimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse, PhaseName, isIlmLifecycle } from '@kbn/streams-schema';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  Settings,
} from '@elastic/charts';
import { useKibana } from '../../../hooks/use_kibana';
import { DataStreamStats } from './hooks/use_data_stream_stats';
import { formatBytes } from './helpers/format_bytes';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { useIngestionRate, useIngestionRatePerTier } from './hooks/use_ingestion_rate';
import { useIlmPhasesColorAndDescription } from './hooks/use_ilm_phases_color_and_description';

export function IngestionRate({
  definition,
  stats,
  isLoadingStats,
  refreshStats,
}: {
  definition?: IngestStreamGetResponse;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
  refreshStats: () => void;
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { timeRange, setTimeRange } = data.query.timefilter.timefilter.useTimefilter();

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                  defaultMessage: 'Ingestion rate',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  refreshStats();
                  return;
                }

                if (dateRange) {
                  setTimeRange({
                    from: dateRange.from,
                    to: dateRange?.to,
                    mode: dateRange.mode,
                  });
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer />

      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        style={{ width: '100%', minHeight: '250px' }}
        direction="column"
        gutterSize="xs"
      >
        {!definition ? null : isIlmLifecycle(definition?.effective_lifecycle) ? (
          <ChartBarSeries
            definition={definition}
            stats={stats}
            timeRange={timeRange}
            isLoadingStats={isLoadingStats}
          />
        ) : (
          <ChartAreaSeries
            definition={definition}
            stats={stats}
            timeRange={timeRange}
            isLoadingStats={isLoadingStats}
          />
        )}
      </EuiFlexGroup>
    </>
  );
}

function ChartAreaSeries({
  definition,
  stats,
  timeRange,
  isLoadingStats,
}: {
  definition?: IngestStreamGetResponse;
  stats?: DataStreamStats;
  timeRange: TimeRange;
  isLoadingStats: boolean;
}) {
  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = useIngestionRate({ definition, stats, timeRange });
  const { colorMode } = useEuiTheme();

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : !definition || isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} baseTheme={colorMode === 'LIGHT' ? LIGHT_THEME : DARK_THEME} />

        <AreaSeries
          id="ingestionRate"
          name="Ingestion rate"
          data={ingestionRate.buckets}
          color="#61A2FF"
          xScaleType="time"
          xAccessor={'key'}
          yAccessors={['value']}
        />

        <Axis
          id="bottom-axis"
          position="bottom"
          tickFormat={(value) => moment(value).format('YYYY-MM-DD HH:mm:ss')}
          gridLine={{ visible: true }}
        />
        <Axis
          id="left-axis"
          position="left"
          tickFormat={(value) => formatBytes(value)}
          gridLine={{ visible: true }}
        />
      </Chart>

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiText size="xs">
            <b>
              {toLegendFormat(ingestionRate.start)} - {toLegendFormat(ingestionRate.end)} (interval:{' '}
              {ingestionRate.interval})
            </b>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function ChartBarSeries({
  definition,
  stats,
  timeRange,
  isLoadingStats,
}: {
  definition?: IngestStreamGetResponse;
  stats?: DataStreamStats;
  timeRange: TimeRange;
  isLoadingStats: boolean;
}) {
  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = useIngestionRatePerTier({ definition, stats, timeRange });
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const { colorMode } = useEuiTheme();

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : !definition || isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} baseTheme={colorMode === 'LIGHT' ? LIGHT_THEME : DARK_THEME} />
        {Object.entries(ingestionRate.buckets).map(([tier, buckets]) => (
          <BarSeries
            id={`ingestionRate-${tier}`}
            key={`ingestionRate-${tier}`}
            name={capitalize(tier)}
            data={buckets}
            color={ilmPhases[tier as PhaseName].color}
            xScaleType="time"
            xAccessor={'key'}
            yAccessors={['value']}
            stackAccessors={[0]}
          />
        ))}

        <Axis
          id="bottom-axis"
          position="bottom"
          tickFormat={(value) => moment(value).format('YYYY-MM-DD HH:mm:ss')}
          gridLine={{ visible: true }}
        />
        <Axis
          id="left-axis"
          position="left"
          tickFormat={(value) => formatBytes(value)}
          gridLine={{ visible: true }}
        />
      </Chart>

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiText size="xs">
            <b>
              {toLegendFormat(ingestionRate.start)} - {toLegendFormat(ingestionRate.end)} (interval:{' '}
              {ingestionRate.interval})
            </b>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function toLegendFormat(date: moment.Moment) {
  return date.format('MMM DD, YYYY @ HH:mm:ss');
}
