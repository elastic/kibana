/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  formatNumber,
} from '@elastic/eui';
import { Axis, BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import moment from 'moment';
import React from 'react';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { StreamsAppStartDependencies } from '../types';
import {
  formatBytes,
  formatIngestionRate,
} from '../components/data_management/stream_detail_lifecycle/helpers/format_bytes';
import { calculateDataQuality } from '../util/calculate_data_quality';
import {
  useIngestionRate,
  type StreamAggregations,
} from '../components/data_management/stream_detail_lifecycle/hooks/use_ingestion_rate';
import type { CalculatedStats } from '../components/data_management/stream_detail_lifecycle/helpers/get_calculated_stats';

interface StreamMetricsEmbeddableComponentProps {
  streamName: string;
  definition: Streams.ingest.all.GetResponse | undefined;
  isLoadingDefinition: boolean;
  definitionError: Error | undefined;
  stats:
    | {
        ds: {
          stats: {
            totalDocs?: number;
            sizeBytes?: number;
            bytesPerDay?: number;
          } & CalculatedStats;
          aggregations?: StreamAggregations;
        };
      }
    | undefined;
  isLoadingStats: boolean;
  statsError: Error | undefined;
  docCounts:
    | {
        total: number;
        degraded: number;
        failed: number;
      }
    | undefined;
  isLoadingDocCounts: boolean;
  docCountsError: Error | undefined;
  timeState: TimeState;
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
}

export const StreamMetricsEmbeddableComponent: React.FC<StreamMetricsEmbeddableComponentProps> = ({
  streamName,
  definition,
  isLoadingDefinition,
  definitionError,
  stats,
  isLoadingStats,
  statsError,
  docCounts,
  isLoadingDocCounts,
  docCountsError,
  timeState,
  coreStart,
  pluginsStart,
}) => {
  if (!streamName) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h3>
            {i18n.translate('xpack.streams.streamMetricsEmbeddable.noStreamSelected', {
              defaultMessage: 'No stream selected',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.streams.streamMetricsEmbeddable.noStreamSelectedDescription', {
              defaultMessage: 'Please configure this panel to select a stream.',
            })}
          </p>
        }
      />
    );
  }

  if (isLoadingDefinition && !definition) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
        <EuiLoadingChart size="xl" />
      </EuiFlexGroup>
    );
  }

  if (definitionError) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        color="danger"
        title={
          <h3>
            {i18n.translate('xpack.streams.streamMetricsEmbeddable.errorLoadingStream', {
              defaultMessage: 'Error loading stream',
            })}
          </h3>
        }
        body={<p>{definitionError.message}</p>}
      />
    );
  }

  if (!definition) {
    return null;
  }

  const dataQuality = docCounts
    ? calculateDataQuality({
        totalDocs: docCounts.total,
        degradedDocs: docCounts.degraded,
        failedDocs: docCounts.failed,
      })
    : undefined;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={css`
        height: 100%;
        padding: 8px;
        overflow: auto;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={1}>
            <MetricCard
              label={i18n.translate('xpack.streams.streamMetricsEmbeddable.retention', {
                defaultMessage: 'Retention',
              })}
              isLoading={isLoadingDefinition}
            >
              <RetentionValue definition={definition} />
            </MetricCard>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <MetricCard
              label={i18n.translate('xpack.streams.streamMetricsEmbeddable.storageSize', {
                defaultMessage: 'Storage Size',
              })}
              isLoading={isLoadingStats}
            >
              {stats?.ds.stats.sizeBytes ? formatBytes(stats.ds.stats.sizeBytes) : '-'}
            </MetricCard>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <MetricCard
              label={
                <>
                  {i18n.translate('xpack.streams.streamMetricsEmbeddable.ingestRate', {
                    defaultMessage: 'Ingest Rate',
                  })}
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.streams.streamMetricsEmbeddable.ingestRateTooltip',
                      {
                        defaultMessage:
                          'Approximate average (stream total size divided by the number of days since creation).',
                      }
                    )}
                    position="right"
                  />
                </>
              }
              isLoading={isLoadingStats}
            >
              {stats?.ds.stats.bytesPerDay
                ? formatIngestionRate(stats.ds.stats.bytesPerDay, true)
                : '-'}
            </MetricCard>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <MetricCard
              label={i18n.translate('xpack.streams.streamMetricsEmbeddable.dataQuality', {
                defaultMessage: 'Data Quality',
              })}
              isLoading={isLoadingDocCounts}
            >
              {dataQuality ? (
                <DatasetQualityIndicator
                  quality={dataQuality}
                  isLoading={isLoadingDocCounts}
                  showTooltip
                />
              ) : (
                '-'
              )}
            </MetricCard>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="s"
          css={css`
            height: 100%;
            min-height: 150px;
          `}
        >
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.streamMetricsEmbeddable.ingestionOverTime', {
              defaultMessage: 'Ingestion over time',
            })}
          </EuiText>
          <EuiSpacer size="xs" />
          <IngestionChart
            stats={stats?.ds.stats}
            aggregations={stats?.ds.aggregations}
            timeState={timeState}
            isLoading={isLoadingStats}
            error={statsError}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface MetricCardProps {
  label: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, children, isLoading }) => {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <EuiText
        size="s"
        css={css`
          font-weight: 600;
        `}
      >
        {isLoading ? <EuiLoadingChart size="m" /> : children}
      </EuiText>
    </EuiPanel>
  );
};

const RetentionValue: React.FC<{ definition: Streams.ingest.all.GetResponse }> = ({
  definition,
}) => {
  if (!definition) return <>-</>;

  if (isDslLifecycle(definition.effective_lifecycle)) {
    return (
      <>
        {definition.effective_lifecycle.dsl.data_retention ||
          i18n.translate('xpack.streams.streamMetricsEmbeddable.keepIndefinitely', {
            defaultMessage: 'Keep indefinitely',
          })}
      </>
    );
  }

  if (isIlmLifecycle(definition.effective_lifecycle)) {
    return <>{definition.effective_lifecycle.ilm.policy}</>;
  }

  return <>-</>;
};

interface IngestionChartProps {
  stats?: CalculatedStats;
  aggregations?: StreamAggregations;
  timeState: TimeState;
  isLoading: boolean;
  error: Error | undefined;
}

const IngestionChart: React.FC<IngestionChartProps> = ({
  stats,
  aggregations,
  timeState,
  isLoading,
  error,
}) => {
  const chartBaseTheme = useElasticChartsTheme();

  const { ingestionRate } = useIngestionRate({
    calculatedStats: stats,
    timeState,
    aggregations,
    isLoading,
    error,
  });

  const formatAsBytes = Boolean(stats?.bytesPerDoc && stats.bytesPerDoc > 0);

  if (error) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          height: 100%;
        `}
      >
        <EuiText size="s" color="danger">
          {i18n.translate('xpack.streams.streamMetricsEmbeddable.chartError', {
            defaultMessage: 'Failed to load chart data',
          })}
        </EuiText>
      </EuiFlexGroup>
    );
  }

  if (isLoading && !ingestionRate) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          height: 100%;
        `}
      >
        <EuiLoadingChart size="xl" />
      </EuiFlexGroup>
    );
  }

  if (!ingestionRate || !ingestionRate.buckets || ingestionRate.buckets.length === 0) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          height: 100%;
        `}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.streamMetricsEmbeddable.noChartData', {
            defaultMessage: 'No data available for the selected time range',
          })}
        </EuiText>
      </EuiFlexGroup>
    );
  }

  return (
    <div
      css={css`
        height: calc(100% - 20px);
        width: 100%;
      `}
    >
      <Chart size={{ height: '100%', width: '100%' }}>
        <Settings showLegend={false} baseTheme={chartBaseTheme} />
        <BarSeries
          id="ingestionRate"
          name={i18n.translate('xpack.streams.streamMetricsEmbeddable.ingestionRateSeries', {
            defaultMessage: 'Ingestion',
          })}
          data={ingestionRate.buckets}
          xScaleType={ScaleType.Time}
          xAccessor="key"
          yAccessors={['value']}
        />
        <Axis
          id="bottom-axis"
          position="bottom"
          tickFormat={(value) => moment(value).format('MM-DD HH:mm')}
          gridLine={{ visible: true }}
        />
        <Axis
          id="left-axis"
          position="left"
          tickFormat={(value) => (formatAsBytes ? formatBytes(value) : formatNumber(value, '0,0'))}
          gridLine={{ visible: true }}
        />
      </Chart>
    </div>
  );
};
