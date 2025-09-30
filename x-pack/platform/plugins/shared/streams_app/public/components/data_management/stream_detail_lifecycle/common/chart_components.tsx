/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  formatNumber,
  useEuiTheme,
} from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { TimeState } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName, Streams } from '@kbn/streams-schema';
import { capitalize } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import { orderIlmPhases } from '../helpers/helpers';
import { formatBytes } from '../helpers/format_bytes';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import { useIngestionRate, useIngestionRatePerTier } from '../hooks/use_ingestion_rate';
import type { FailureStoreStats } from '../hooks/use_failure_store_stats';
import { useTimefilter } from '../../../../hooks/use_timefilter';

interface BaseChartComponentProps {
  definition: Streams.ingest.all.GetResponse;
  timeState: TimeState;
  isLoadingStats: boolean;
}

interface MainStreamChartProps extends BaseChartComponentProps {
  stats?: DataStreamStats;
}

interface FailureStoreChartProps extends BaseChartComponentProps {
  stats?: FailureStoreStats;
}

type ChartComponentProps = MainStreamChartProps | FailureStoreChartProps;
type ChartPhasesComponentProps = MainStreamChartProps | FailureStoreChartProps;

export function ChartBarSeries({
  definition,
  stats,
  timeState,
  isLoadingStats,
}: ChartComponentProps) {
  // Use the appropriate hook based on isFailureStore flag
  const mainStreamResult = useIngestionRate({
    definition,
    stats,
    timeState,
  });

  const formatAsBytes = !!stats;

  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = mainStreamResult;

  return (
    <ChartBarSeriesBase
      ingestionRate={ingestionRate}
      isLoadingIngestionRate={isLoadingIngestionRate}
      ingestionRateError={ingestionRateError}
      isLoadingStats={isLoadingStats}
      formatAsBytes={formatAsBytes}
      isFailureStore={false}
    />
  );
}

export function FailureStoreChartBarSeries({
  definition,
  stats,
  timeState,
  isLoadingStats,
}: ChartComponentProps) {
  // Use the appropriate hook based on isFailureStore flag
  const failureStoreResult = useIngestionRate({
    definition,
    stats,
    timeState,
    isFailureStore: true,
  });

  const formatAsBytes = !!stats;

  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = failureStoreResult;

  return (
    <ChartBarSeriesBase
      ingestionRate={ingestionRate}
      isLoadingIngestionRate={isLoadingIngestionRate}
      ingestionRateError={ingestionRateError}
      isLoadingStats={isLoadingStats}
      formatAsBytes={formatAsBytes}
      isFailureStore
    />
  );
}

export function ChartBarSeriesBase({
  ingestionRate,
  isLoadingIngestionRate,
  ingestionRateError,
  isLoadingStats,
  formatAsBytes,
  isFailureStore,
}: {
  ingestionRate: any;
  isLoadingIngestionRate: boolean;
  ingestionRateError: Error | undefined;
  isLoadingStats: boolean;
  formatAsBytes?: boolean;
  isFailureStore: boolean;
}) {
  // Use the appropriate hook based on isFailureStore flag
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} baseTheme={chartBaseTheme} />

        <BarSeries
          id="ingestionRate"
          name="Ingestion rate"
          data={ingestionRate.buckets as Array<{ key: any; value: any }>}
          color={
            isFailureStore ? euiTheme.colors.severity.danger : euiTheme.colors.severity.success
          }
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
          tickFormat={(value) => (formatAsBytes ? formatBytes(value) : formatNumber(value, '0,0'))}
          gridLine={{ visible: true }}
        />
      </Chart>
    </>
  );
}

function ChartBarPhasesSeriesBase({
  ingestionRate,
  isLoadingIngestionRate,
  ingestionRateError,
  isLoadingStats,
  formatAsBytes,
}: {
  ingestionRate: any;
  isLoadingIngestionRate: boolean;
  ingestionRateError: Error | undefined;
  isLoadingStats: boolean;
  formatAsBytes?: boolean;
}) {
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const chartBaseTheme = useElasticChartsTheme();

  const availablePhases = useMemo(() => {
    if (!ingestionRate) return {};
    const phaseKeys = Object.keys(ingestionRate.buckets) as (keyof typeof ilmPhases)[];
    return phaseKeys.reduce((acc, phase) => {
      acc[phase] = { name: phase } as any;
      return acc;
    }, {} as IlmPolicyPhases);
  }, [ingestionRate]);

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" css={{ width: '100%' }} gutterSize="s">
        <EuiFlexItem grow={9}>
          <Chart size={{ height: 250 }}>
            <Settings showLegend={false} baseTheme={chartBaseTheme} />
            {Object.entries(ingestionRate.buckets).map(([tier, buckets]) => (
              <BarSeries
                id={`ingestionRate-${tier}`}
                key={`ingestionRate-${tier}`}
                name={capitalize(tier)}
                data={buckets as Array<{ key: any; value: any }>}
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
              tickFormat={(value) =>
                formatAsBytes ? formatBytes(value) : formatNumber(value, '0,0')
              }
            />
          </Chart>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <PhasesLegend phases={availablePhases} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export function ChartBarPhasesSeries({
  definition,
  stats,
  timeState,
  isLoadingStats,
}: ChartPhasesComponentProps) {
  const { timeState: defaultTimeState } = useTimefilter();
  const currentTimeState = timeState || defaultTimeState;

  // Use the appropriate hook based on isFailureStore flag
  const mainStreamResult = useIngestionRatePerTier({
    definition,
    stats,
    timeState: currentTimeState,
  });

  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = mainStreamResult;

  const formatAsBytes = Boolean(stats?.bytesPerDoc && stats?.bytesPerDoc > 0);

  return (
    <ChartBarPhasesSeriesBase
      ingestionRate={ingestionRate}
      isLoadingIngestionRate={isLoadingIngestionRate}
      ingestionRateError={ingestionRateError}
      isLoadingStats={isLoadingStats}
      formatAsBytes={formatAsBytes}
    />
  );
}

function PhasesLegend({ phases }: { phases?: IlmPolicyPhases }) {
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const availablePhases = useMemo(() => {
    if (!phases) return [];

    const desc = orderIlmPhases(phases)
      .filter(({ name }) => name !== 'delete')
      .map((phase) => ({
        name: phase.name,
        color: ilmPhases[phase.name].color,
      })) as Array<
      {
        name: PhaseName | 'indefinite';
      } & ({ color: string } | { icon: string })
    >;

    return desc;
  }, [phases, ilmPhases]);

  if (!phases) return null;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      <EuiText>
        <h5>
          {i18n.translate('xpack.streams.streamDetailLifecycle.dataTiers', {
            defaultMessage: 'Data Tiers',
          })}
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      {availablePhases.map((phase) => (
        <React.Fragment key={phase.name}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false} css={{ width: '20px', alignItems: 'center' }}>
              {'color' in phase ? (
                <span
                  style={{
                    height: '12px',
                    width: '12px',
                    borderRadius: '50%',
                    backgroundColor: phase.color,
                    display: 'inline-block',
                  }}
                />
              ) : (
                <EuiIcon type={phase.icon} />
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={2}>{capitalize(phase.name)}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </EuiPanel>
  );
}
