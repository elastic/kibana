/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { PhaseName, Streams, isIlmLifecycle } from '@kbn/streams-schema';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import { AreaSeries, Axis, BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { TimeState } from '@kbn/es-query';
import { DataStreamStats } from './hooks/use_data_stream_stats';
import { formatBytes } from './helpers/format_bytes';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';
import { useIngestionRate, useIngestionRatePerTier } from './hooks/use_ingestion_rate';
import { useIlmPhasesColorAndDescription } from './hooks/use_ilm_phases_color_and_description';
import { useTimefilter } from '../../../hooks/use_timefilter';

export function IngestionRate({
  definition,
  stats,
  isLoadingStats,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
}) {
  const { timeState } = useTimefilter();

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiText>
                <h5>
                  {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                    defaultMessage: 'Ingestion rate',
                  })}
                </h5>
              </EuiText>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.streams.streamDetailLifecycle.ingestionRatePanelTooltip',
                  {
                    defaultMessage:
                      'Approximate average. Interval adjusts dynamically based on the time range. Calculated using the average document size in the stream, multiplied with the number of documents in the time bucket.',
                  }
                )}
                position="right"
              />
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer />

      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={{ width: '100%', minHeight: '250px' }}
        direction="column"
        gutterSize="xs"
      >
        {isIlmLifecycle(definition.effective_lifecycle) ? (
          <ChartBarSeries
            definition={definition}
            stats={stats}
            timeState={timeState}
            isLoadingStats={isLoadingStats}
          />
        ) : (
          <ChartAreaSeries
            definition={definition}
            stats={stats}
            timeState={timeState}
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
  timeState,
  isLoadingStats,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  timeState: TimeState;
  isLoadingStats: boolean;
}) {
  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = useIngestionRate({ definition, stats, timeState });
  const chartBaseTheme = useElasticChartsTheme();

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} baseTheme={chartBaseTheme} />

        <AreaSeries
          id="ingestionRate"
          name="Ingestion rate"
          data={ingestionRate.buckets}
          color="#61A2FF"
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
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

      <Legend interval={ingestionRate.interval} />
    </>
  );
}

function ChartBarSeries({
  definition,
  stats,
  timeState,
  isLoadingStats,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  timeState: TimeState;
  isLoadingStats: boolean;
}) {
  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = useIngestionRatePerTier({ definition, stats, timeState });
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const chartBaseTheme = useElasticChartsTheme();

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} baseTheme={chartBaseTheme} />
        {Object.entries(ingestionRate.buckets).map(([tier, buckets]) => (
          <BarSeries
            id={`ingestionRate-${tier}`}
            key={`ingestionRate-${tier}`}
            name={capitalize(tier)}
            data={buckets}
            color={ilmPhases[tier as PhaseName].color}
            // Defaults to multi layer time axis as of Elastic Charts v70
            xScaleType={ScaleType.Time}
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

      <Legend interval={ingestionRate.interval} />
    </>
  );
}

function Legend({ interval }: { interval: string }) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow>
        <EuiText size="xs">
          <b>
            {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRateLegend', {
              defaultMessage: 'per {interval}',
              values: { interval },
            })}
          </b>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
