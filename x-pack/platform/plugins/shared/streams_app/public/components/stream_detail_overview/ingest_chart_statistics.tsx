/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiHorizontalRule, EuiLoadingSpinner, formatNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildDataQualityTotalDocCountEsql } from '../../util/stream_overview_esql';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { executeEsqlQuery } from '../../hooks/use_execute_esql_query';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';
import { StatCell, TrendSubtitle } from './stat_cell';

interface StatDataPoint {
  x: number;
  doc_count: number | null;
}

interface StatSeries {
  id: string;
  data: StatDataPoint[];
}

export interface IngestChartStatisticsProps {
  allTimeseries: StatSeries[];
  /** Duration of each histogram bucket in milliseconds. */
  intervalMs: number;
  /** Start of the current time range as a Unix timestamp in ms. */
  timeStart: number;
  /** End of the current time range as a Unix timestamp in ms. */
  timeEnd: number;
  /** ES|QL source for the stream (stream name, or query view for query streams). */
  esqlSource: string;
  streamName: string;
  /** Query streams are views over other streams and have no dedicated index, so storage is not shown. */
  isQueryStream: boolean;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function IngestChartStatistics({
  allTimeseries,
  intervalMs,
  timeStart,
  timeEnd,
  esqlSource,
  streamName,
  isQueryStream,
}: IngestChartStatisticsProps) {
  const {
    core: { uiSettings },
    isServerless,
    dependencies: {
      start: {
        data,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const totalDocsFetch = useStreamsAppFetch(
    ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/total', {
        signal,
        params: { query: { stream: streamName } },
      }),
    [streamName, streamsRepositoryClient]
  );

  // Count docs for the equivalent period one week ago to compute trends.
  const previousPeriodFetch = useStreamsAppFetch(
    ({ signal }) =>
      executeEsqlQuery({
        query: buildDataQualityTotalDocCountEsql(esqlSource),
        search: data.search.search,
        signal,
        start: timeStart - WEEK_MS,
        end: timeEnd - WEEK_MS,
        uiSettings,
      }),
    [esqlSource, timeStart, timeEnd, data.search.search, uiSettings]
  );

  const storeStatsFetch = useStreamsAppFetch(
    ({ signal }) =>
      !isQueryStream && !isServerless
        ? streamsRepositoryClient.fetch('GET /internal/streams/{name}/_store_stats', {
            signal,
            params: { path: { name: streamName } },
          })
        : Promise.resolve({ store_size_bytes: 0 }),
    [isQueryStream, isServerless, streamName, streamsRepositoryClient]
  );

  const { docsInRange, peakRateDocsSec, avgDocsPerDay } = useMemo(() => {
    const buckets = allTimeseries.flatMap((s) => s.data.map((d) => d.doc_count ?? 0));
    const total = buckets.reduce((sum, n) => sum + n, 0);
    const peak = buckets.length > 0 ? Math.max(...buckets) : 0;
    const intervalSec = intervalMs / 1000;
    const days = (timeEnd - timeStart) / (1000 * 60 * 60 * 24);

    return {
      docsInRange: total,
      peakRateDocsSec: intervalSec > 0 ? peak / intervalSec : 0,
      avgDocsPerDay: days > 0 ? total / days : 0,
    };
  }, [allTimeseries, intervalMs, timeStart, timeEnd]);

  const totalDocs = totalDocsFetch.value?.find((s) => s.stream === streamName)?.count ?? 0;

  const previousDocsInRange = useMemo(() => {
    const result = previousPeriodFetch.value;

    if (!result?.values?.[0]?.[0] && result?.values?.[0]?.[0] !== 0) {
      return null;
    }

    return result.values[0][0] as number;
  }, [previousPeriodFetch.value]);

  const docsInRangeTrend = computeTrend(docsInRange, previousDocsInRange);

  return (
    <>
      <EuiHorizontalRule margin="m" />

      <EuiFlexGroup responsive wrap={false} gutterSize="xl">
        <StatCell
          title={i18n.translate('xpack.streams.ingestChartStatistics.docsTotal.label', {
            defaultMessage: 'Docs total',
          })}
          value={
            totalDocsFetch.loading ? <EuiLoadingSpinner size="m" /> : formatNumber(totalDocs, '0,0')
          }
          unit={i18n.translate('xpack.streams.ingestChartStatistics.docsTotal.unit', {
            defaultMessage: 'total docs',
          })}
        />

        <StatCell
          title={i18n.translate('xpack.streams.ingestChartStatistics.docsInRange.label', {
            defaultMessage: 'Docs in time range',
          })}
          value={formatNumber(docsInRange, '0,0')}
          unit={i18n.translate('xpack.streams.ingestChartStatistics.docsInRange.unit', {
            defaultMessage: 'docs',
          })}
          subtitle={
            <TrendSubtitle trend={docsInRangeTrend} loading={previousPeriodFetch.loading} />
          }
        />

        <StatCell
          title={i18n.translate('xpack.streams.ingestChartStatistics.peakIngestRate.label', {
            defaultMessage: 'Peak ingest rate',
          })}
          value={formatDocsPerSec(peakRateDocsSec)}
          unit={i18n.translate('xpack.streams.ingestChartStatistics.peakIngestRate.unit', {
            defaultMessage: 'docs/sec',
          })}
          subtitle={
            <TrendSubtitle>
              {i18n.translate('xpack.streams.ingestChartStatistics.peakIngestRate.avg', {
                defaultMessage: 'avg. {count}/day',
                values: { count: formatNumber(avgDocsPerDay, '0,0') },
              })}
            </TrendSubtitle>
          }
        />

        {!isQueryStream && !isServerless && (
          <StatCell
            title={i18n.translate('xpack.streams.ingestChartStatistics.storageSize.label', {
              defaultMessage: 'Storage size',
            })}
            value={
              storeStatsFetch.loading ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                splitFormattedBytes(storeStatsFetch.value?.store_size_bytes ?? 0).value
              )
            }
            unit={
              storeStatsFetch.loading
                ? ''
                : splitFormattedBytes(storeStatsFetch.value?.store_size_bytes ?? 0).unit
            }
            subtitle={<TrendSubtitle trend={null} loading={storeStatsFetch.loading} />}
          />
        )}
      </EuiFlexGroup>
    </>
  );
}

/** Returns the percentage change between current and previous, or null if previous is 0 or unknown. */
function computeTrend(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Formats a docs/sec rate preserving meaningful precision:
 * - >= 100 → integer with thousands separator (e.g. "1,231")
 * - >= 1   → one optional decimal (e.g. "5.7")
 * - < 1    → two decimals (e.g. "0.52")
 */
function formatDocsPerSec(value: number): string {
  if (value >= 100) return formatNumber(value, '0,0');
  if (value >= 1) return formatNumber(value, '0.[0]');
  return formatNumber(value, '0.00');
}

/** Splits a formatted bytes string (e.g. "14.2 GB") into its numeric and unit parts. */
function splitFormattedBytes(bytes: number): { value: string; unit: string } {
  const formatted = formatBytes(bytes);
  const lastSpace = formatted.lastIndexOf(' ');
  if (lastSpace === -1) return { value: formatted, unit: '' };
  return {
    value: formatted.slice(0, lastSpace),
    unit: formatted.slice(lastSpace + 1),
  };
}
