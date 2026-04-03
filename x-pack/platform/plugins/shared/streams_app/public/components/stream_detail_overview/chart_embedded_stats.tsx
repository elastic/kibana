/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  EuiIconTip,
  EuiStat,
  EuiSpacer,
  formatNumber,
} from '@elastic/eui';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { Streams } from '@kbn/streams-schema';
import React, { type ReactNode } from 'react';
import type { AsyncState } from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { useDataStreamStats } from '../stream_management/data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';
import { PhasesLegend } from '../stream_management/data_management/stream_detail_lifecycle/common/chart_components';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { OverviewStatWithTotal } from './overview_stat';
import {
  chartEmbeddedTotalStorageLine,
  fetchEsqlTotalDocCount,
} from './chart_embedded_stats_helpers';

export type ViewMode = 'documents' | 'ingestion_rate';

interface ChartEmbeddedStatsProps {
  definition: Streams.ingest.all.GetResponse;
  /** Same histogram async state as the overview chart (shared `useStreamDocCountsFetch` + cache). */
  statsHistogramResult: AsyncState<ESQLSearchResponse>;
  /** Sum of `doc_count` over the histogram series for the selected range (from parent `allTimeseries`). */
  docCountInRange: number;
  viewMode: ViewMode;
  /** Peak docs/sec across all histogram buckets in the selected range. */
  peakRate: number;
  /** Average docs/sec across the selected time range. */
  avgRate: number;
}

const formatRate = (rate: number) =>
  i18n.translate('xpack.streams.chartEmbeddedStats.rateFormat', {
    defaultMessage: '{rate} /s',
    values: { rate: formatNumber(rate, rate < 1 ? '0.00' : '0,0.0') },
  });

function RateStats({
  peakRate,
  avgRate,
  isLoading,
}: {
  peakRate: number;
  avgRate: number;
  isLoading: boolean;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <OverviewStatWithTotal
          description={i18n.translate('xpack.streams.chartEmbeddedStats.peakRateLabel', {
            defaultMessage: 'Peak rate',
          })}
          rangeTitle={formatRate(peakRate)}
          isLoading={isLoading}
          dataTestSubj="streamsOverviewPeakRate"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <OverviewStatWithTotal
          description={i18n.translate('xpack.streams.chartEmbeddedStats.avgRateLabel', {
            defaultMessage: 'Average rate',
          })}
          rangeTitle={formatRate(avgRate)}
          isLoading={isLoading}
          dataTestSubj="streamsOverviewAvgRate"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ChartStatsAside({ children }: { children: ReactNode }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem
      grow={false}
      css={{ minWidth: euiTheme.size.xxl, maxWidth: 240 }}
      data-test-subj="streamsAppStreamOverviewChartEmbeddedStats"
    >
      {children}
    </EuiFlexItem>
  );
}

function DocCountStatRow({
  statsHistogramResult,
  docCountInRange,
  totalLine,
}: {
  statsHistogramResult: AsyncState<ESQLSearchResponse>;
  docCountInRange: number;
  totalLine: string;
}) {
  return (
    <>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.docCountStatRow.statsLabel', { defaultMessage: 'Stats' })}{' '}
        <EuiIconTip
          type="question"
          color="subdued"
          size="s"
          content="Stats"
          aria-label={i18n.translate(
            'xpack.streams.streamOverview.overviewStat.euiIconTip.statsLabel',
            {
              defaultMessage: 'Stats',
            }
          )}
        />
      </EuiText>
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiStat title={totalLine} description="" />
        </EuiFlexItem>

        <EuiFlexItem grow={false} alignItems="bottom">
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.docCountStatRow.docsTotalTextLabel', {
              defaultMessage: 'Docs total',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

/**
 * Doc count for the selected time range plus all-time total from the query view (query streams — no storage estimate).
 */
export function ChartEmbeddedQueryDocStats({
  esqlSource,
  statsHistogramResult,
  docCountInRange,
}: {
  /** ES|QL `FROM` target (`definition.stream.query.view` for query streams). */
  esqlSource: string;
  statsHistogramResult: AsyncState<ESQLSearchResponse>;
  docCountInRange: number;
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const totalDocsResult = useStreamsAppFetch(
    async ({ signal }) => {
      return fetchEsqlTotalDocCount(esqlSource, data.search.search, signal);
    },
    [esqlSource, data.search.search],
    { withRefresh: true }
  );

  let totalDocsLine = '';

  if (totalDocsResult.loading) {
    totalDocsLine = '—';
  } else if (totalDocsResult.error) {
    totalDocsLine = '—';
  } else if (typeof totalDocsResult.value === 'number' && !isNaN(totalDocsResult.value)) {
    totalDocsLine = String(totalDocsResult.value);
  }

  return (
    <ChartStatsAside>
      <DocCountStatRow
        statsHistogramResult={statsHistogramResult}
        docCountInRange={docCountInRange}
        totalLine={totalDocsLine}
      />
    </ChartStatsAside>
  );
}

/**
 * Routes to ingest (doc + storage) or query (doc + ES|QL total) embedded stats beside the chart.
 */
export function ChartEmbeddedSideStats({
  definition,
  esqlSource,
  statsHistogramResult,
  docCountInRange,
  viewMode = 'documents',
  peakRate = 0,
  avgRate = 0,
}: {
  definition: Streams.all.GetResponse;
  esqlSource: string;
  statsHistogramResult: AsyncState<ESQLSearchResponse>;
  docCountInRange: number;
  viewMode?: ViewMode;
  peakRate?: number;
  avgRate?: number;
}) {
  if (Streams.ingest.all.GetResponse.is(definition)) {
    return (
      <ChartEmbeddedStats
        definition={definition}
        statsHistogramResult={statsHistogramResult}
        docCountInRange={docCountInRange}
        viewMode={viewMode}
        peakRate={peakRate}
        avgRate={avgRate}
      />
    );
  }
  return (
    <ChartEmbeddedQueryDocStats
      esqlSource={esqlSource}
      statsHistogramResult={statsHistogramResult}
      docCountInRange={docCountInRange}
    />
  );
}

const ALL_TIER_PHASES = Object.fromEntries(
  (['hot', 'warm', 'cold', 'frozen'] as const).map((name) => [name, { name }])
);

/**
 * Color legend for the four storage tiers. Shown for all ingest streams since data always
 * resides in one or more tiers regardless of lifecycle type (DSL, ILM, inherited).
 */
function StorageTiersLegend() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PhasesLegend phases={ALL_TIER_PHASES as any} />;
}

/**
 * Time-range document count + estimated storage, with all-time totals — shown beside the overview chart (ingest streams).
 */
export function ChartEmbeddedStats({
  definition,
  statsHistogramResult,
  docCountInRange,
  viewMode,
  peakRate,
  avgRate,
}: ChartEmbeddedStatsProps) {
  const { timeState } = useTimefilter();

  const { stats, isLoading: isStatsLoading } = useDataStreamStats({ definition, timeState });
  const canReadFailureStore = definition.privileges.read_failure_store;

  const mainDocsAllTime = stats?.ds.stats.totalDocs ?? 0;
  const mainSizeBytes = stats?.ds.stats.sizeBytes ?? 0;
  const failureDocsAllTime = stats?.fs?.stats?.count ?? 0;
  const failureSizeBytes = stats?.fs?.stats?.size ?? 0;

  const totalDocsForStorageAvg = canReadFailureStore
    ? mainDocsAllTime + failureDocsAllTime
    : mainDocsAllTime;
  const totalSizeBytesForStorage = canReadFailureStore
    ? mainSizeBytes + failureSizeBytes
    : mainSizeBytes;

  const bytesPerDoc =
    totalDocsForStorageAvg > 0 && totalSizeBytesForStorage > 0
      ? totalSizeBytesForStorage / totalDocsForStorageAvg
      : 0;
  const estimatedSizeBytesUncapped = bytesPerDoc * docCountInRange;
  const estimatedSizeBytesInRange =
    totalSizeBytesForStorage > 0
      ? Math.min(estimatedSizeBytesUncapped, totalSizeBytesForStorage)
      : estimatedSizeBytesUncapped;
  const isStorageLoading = isStatsLoading || statsHistogramResult.loading;
  const rangeStorageTitle =
    !isStorageLoading && !statsHistogramResult.error ? formatBytes(estimatedSizeBytesInRange) : '—';

  const showTotals = stats !== undefined && !isStatsLoading;
  const totalDocsLine = showTotals ? String(totalDocsForStorageAvg) : '—';
  const totalStorageLine = showTotals
    ? chartEmbeddedTotalStorageLine(totalSizeBytesForStorage)
    : '—';

  return (
    <ChartStatsAside>
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          {viewMode === 'ingestion_rate' ? (
            <RateStats
              peakRate={peakRate}
              avgRate={avgRate}
              isLoading={statsHistogramResult.loading}
            />
          ) : (
            <>
              <DocCountStatRow
                statsHistogramResult={statsHistogramResult}
                docCountInRange={docCountInRange}
                totalLine={totalDocsLine}
              />
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.chartEmbeddedStats.docsInSelectedTimeTextLabel', {
                  defaultMessage: '{docCount} docs in selected time range',
                  values: { docCount: docCountInRange },
                })}
              </EuiText>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StorageTiersLegend />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChartStatsAside>
  );
}
