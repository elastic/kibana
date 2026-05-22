/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import type { ISearchGeneric } from '@kbn/search-types';
import type { AsyncState } from 'react-use/lib/useAsync';

import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';
import { executeEsqlQuery } from '../../hooks/use_execute_esql_query';
import { buildDataQualityTotalDocCountEsql } from '../../util/stream_overview_esql';

export function histogramRangeDocCountTitle(
  histogramResult: AsyncState<ESQLSearchResponse>,
  docCountInRange: number
): string {
  if (histogramResult.error) {
    return '—';
  }
  if (histogramResult.loading && histogramResult.value === undefined) {
    return '—';
  }
  return formatNumber(docCountInRange, '0a');
}

/** Skeleton state for the embedded doc-count stat (aligned with `histogramRangeDocCountTitle`). */
export function histogramDocCountStatIsLoading(
  histogramResult: AsyncState<ESQLSearchResponse>
): boolean {
  return histogramResult.loading && histogramResult.value === undefined;
}

export function chartEmbeddedDocCountDescription(): string {
  return i18n.translate('xpack.streams.streamOverview.chartEmbeddedStats.docCountLabel', {
    defaultMessage: 'Doc count',
  });
}

export function chartEmbeddedTotalDocsLine(count: number): string {
  return i18n.translate('xpack.streams.streamOverview.chartEmbeddedStats.totalDocsLine', {
    defaultMessage: 'Total {value}',
    values: { value: formatNumber(count, '0a') },
  });
}

export function chartEmbeddedTotalStorageLine(sizeBytes: number): string {
  return i18n.translate('xpack.streams.streamOverview.chartEmbeddedStats.totalStorageLine', {
    defaultMessage: 'Total {value}',
    values: { value: formatBytes(sizeBytes) },
  });
}

export function chartEmbeddedEstimatedStorageTooltip(): string {
  return i18n.translate('xpack.streams.streamOverview.chartEmbeddedStats.estimatedStorageTooltip', {
    defaultMessage: 'The approximate amount of data stored in the selected time range.',
  });
}

export function chartEmbeddedEstimatedStorageLabel(): string {
  return i18n.translate('xpack.streams.streamOverview.chartEmbeddedStats.estimatedStorageLabel', {
    defaultMessage: 'Estimated storage size',
  });
}

export async function fetchEsqlTotalDocCount(
  esqlSource: string,
  search: ISearchGeneric,
  signal: AbortSignal,
  uiSettings: IUiSettingsClient
): Promise<number> {
  const response = await executeEsqlQuery({
    query: buildDataQualityTotalDocCountEsql(esqlSource),
    search,
    signal,
    uiSettings,
  });
  const colIdx = response.columns.findIndex((c) => c.name === 'doc_count');
  return colIdx !== -1 ? (response.values[0]?.[colIdx] as number) ?? 0 : 0;
}
