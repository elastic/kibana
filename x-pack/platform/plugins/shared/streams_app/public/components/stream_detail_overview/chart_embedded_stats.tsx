/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { Streams } from '@kbn/streams-schema';
import React, { type ReactNode } from 'react';
import type { AsyncState } from 'react-use/lib/useAsync';
import { useDataStreamStats } from '../stream_management/data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { OverviewStatWithTotal } from './overview_stat';
import {
  chartEmbeddedDocCountDescription,
  chartEmbeddedEstimatedStorageLabel,
  chartEmbeddedEstimatedStorageTooltip,
  chartEmbeddedTotalDocsLine,
  chartEmbeddedTotalStorageLine,
  fetchEsqlTotalDocCount,
  histogramDocCountStatIsLoading,
  histogramRangeDocCountTitle,
} from './chart_embedded_stats_helpers';

interface ChartEmbeddedStatsProps {
  definition: Streams.ingest.all.GetResponse;
  /** Same histogram async state as the overview chart (shared `useStreamDocCountsFetch` + cache). */
  statsHistogramResult: AsyncState<ESQLSearchResponse>;
  /** Sum of `doc_count` over the histogram series for the selected range (from parent `allTimeseries`). */
  docCountInRange: number;
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
    <OverviewStatWithTotal
      description={chartEmbeddedDocCountDescription()}
      rangeTitle={histogramRangeDocCountTitle(statsHistogramResult, docCountInRange)}
      totalLine={totalLine}
      isLoading={histogramDocCountStatIsLoading(statsHistogramResult)}
      dataTestSubj="streamsOverviewDocCount"
    />
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
    core: { uiSettings },
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const totalDocsResult = useStreamsAppFetch(
    async ({ signal }) => {
      return fetchEsqlTotalDocCount(esqlSource, data.search.search, signal, uiSettings);
    },
    [esqlSource, data.search.search, uiSettings],
    { withRefresh: true }
  );

  const totalDocsLine = totalDocsResult.loading
    ? '—'
    : totalDocsResult.error
    ? '—'
    : chartEmbeddedTotalDocsLine(totalDocsResult.value ?? 0);

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
}: {
  definition: Streams.all.GetResponse;
  esqlSource: string;
  statsHistogramResult: AsyncState<ESQLSearchResponse>;
  docCountInRange: number;
}) {
  if (Streams.ingest.all.GetResponse.is(definition)) {
    return (
      <ChartEmbeddedStats
        definition={definition}
        statsHistogramResult={statsHistogramResult}
        docCountInRange={docCountInRange}
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

/**
 * Time-range document count + estimated storage, with all-time totals — shown beside the overview chart (ingest streams).
 */
export function ChartEmbeddedStats({
  definition,
  statsHistogramResult,
  docCountInRange,
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
  const totalDocsLine = showTotals ? chartEmbeddedTotalDocsLine(totalDocsForStorageAvg) : '—';
  const totalStorageLine = showTotals
    ? chartEmbeddedTotalStorageLine(totalSizeBytesForStorage)
    : '—';

  return (
    <ChartStatsAside>
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <DocCountStatRow
            statsHistogramResult={statsHistogramResult}
            docCountInRange={docCountInRange}
            totalLine={totalDocsLine}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OverviewStatWithTotal
            description={chartEmbeddedEstimatedStorageLabel()}
            rangeTitle={rangeStorageTitle}
            totalLine={totalStorageLine}
            isLoading={isStorageLoading}
            descriptionInfoTooltip={chartEmbeddedEstimatedStorageTooltip()}
            dataTestSubj="streamsOverviewStorageSize"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChartStatsAside>
  );
}
