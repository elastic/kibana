/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiHighlight, EuiIconTip, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { useStreamDocCountsFetch } from '../../../hooks/use_streams_doc_counts_fetch';
import { STREAMS_HISTOGRAM_NUM_DATA_POINTS } from '../../../hooks/use_streams_doc_counts_fetch';
import type { useTimefilter } from '../../../hooks/use_timefilter';
import { DiscoverBadgeButton } from '../../stream_badges';
import { DataQualityColumn } from '../../stream_list_view/data_quality_column';
import { DocumentsColumn } from '../../stream_list_view/documents_column';
import { IngestionColumn } from '../../stream_list_view/ingestion_column';
import { RetentionColumn } from '../../stream_list_view/retention_column';
import { StorageColumn } from '../../stream_list_view/storage_column';
import {
  ACTIONS_COLUMN_HEADER,
  DATA_QUALITY_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
  EXTERNAL_BADGE_LABEL,
  FAILURE_STORE_PERMISSIONS_ERROR,
  INGESTION_COLUMN_HEADER,
  INTERNAL_BADGE_LABEL,
  MANAGED_BADGE_LABEL,
  NAME_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  STORAGE_COLUMN_HEADER,
} from './translations';
import type { DestinationRow } from './types';

const SORTABLE_FIELDS = [
  'name',
  'documentsCount',
  'ingestionRate',
  'storageBytes',
  'dataQuality',
  'retentionMs',
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const isSortableField = (value: string): value is SortableField =>
  (SORTABLE_FIELDS as readonly string[]).includes(value);

export const getEffectiveSortField = (
  sortField: string,
  metricSortReady: Record<Exclude<SortableField, 'name' | 'retentionMs'>, boolean>
): SortableField => {
  if (!isSortableField(sortField)) {
    return 'name';
  }
  if (sortField === 'name' || sortField === 'retentionMs') {
    return sortField;
  }
  return metricSortReady[sortField] ? sortField : 'name';
};

const QUALITY_RANK: Record<QualityIndicators, number> = {
  poor: 0,
  degraded: 1,
  good: 2,
};

export interface DestinationColumnsDeps {
  searchText: string;
  getDestinationHref: (destinationName: string) => string;
  hasFailureStoreAccess: boolean;
  getStreamHistogram: ReturnType<typeof useStreamDocCountsFetch>['getStreamHistogram'];
  timeState: ReturnType<typeof useTimefilter>['timeState'];
  docCountsLoaded: boolean;
  ingestionLoaded: boolean;
  ingestionError: boolean;
  storageLoaded: boolean;
  qualityLoaded: boolean;
  qualityLoading: boolean;
}

/**
 * Builds the Destinations table columns. Metric columns stay unsortable until
 * their values have loaded, since sorting on placeholder zeroes reorders rows
 * under the user.
 */
export const createDestinationColumns = ({
  searchText,
  getDestinationHref,
  hasFailureStoreAccess,
  getStreamHistogram,
  timeState,
  docCountsLoaded,
  ingestionLoaded,
  ingestionError,
  storageLoaded,
  qualityLoaded,
  qualityLoading,
}: DestinationColumnsDeps): Array<EuiBasicTableColumn<DestinationRow>> => [
  {
    field: 'name',
    name: NAME_COLUMN_HEADER,
    sortable: true,
    dataType: 'string',
    render: (_: unknown, item: DestinationRow) => (
      <DestinationNameCell
        destination={item}
        searchText={searchText}
        href={getDestinationHref(item.name)}
      />
    ),
  },
  {
    field: 'documentsCount',
    name: <ColumnHeader label={DOCUMENTS_COLUMN_HEADER} showWarning={!hasFailureStoreAccess} />,
    width: '180px',
    sortable: docCountsLoaded,
    align: 'right',
    dataType: 'number',
    render: (_: unknown, item: DestinationRow) =>
      item.hasDataStream ? (
        <DocumentsColumn
          indexPattern={item.name}
          histogramQueryFetch={getStreamHistogram(item.name)}
          timeState={timeState}
          numDataPoints={STREAMS_HISTOGRAM_NUM_DATA_POINTS}
        />
      ) : null,
  },
  {
    field: 'ingestionRate',
    name: INGESTION_COLUMN_HEADER,
    width: '112px',
    sortable: ingestionLoaded && !ingestionError,
    align: 'right',
    dataType: 'number',
    render: (_: unknown, item: DestinationRow) =>
      item.hasDataStream ? (
        <IngestionColumn
          rate={item.ingestionRate}
          isLoading={!ingestionLoaded}
          hasError={ingestionError}
        />
      ) : (
        '-'
      ),
  },
  {
    field: 'storageBytes',
    name: STORAGE_COLUMN_HEADER,
    width: '120px',
    sortable: storageLoaded,
    align: 'right',
    dataType: 'number',
    render: (_: unknown, item: DestinationRow) =>
      item.hasDataStream ? (
        <StorageColumn sizeBytes={item.storageBytes} isLoading={!storageLoaded} />
      ) : (
        '-'
      ),
  },
  {
    field: 'dataQuality',
    name: <ColumnHeader label={DATA_QUALITY_COLUMN_HEADER} showWarning={!hasFailureStoreAccess} />,
    width: '112px',
    sortable: qualityLoaded
      ? (item: DestinationRow) =>
          item.dataQuality !== undefined ? QUALITY_RANK[item.dataQuality] : Number.NEGATIVE_INFINITY
      : false,
    dataType: 'string',
    render: (_: unknown, item: DestinationRow) => {
      if (!item.hasDataStream) {
        return '-';
      }
      if (item.dataQuality === undefined && !qualityLoading) {
        return '-';
      }
      return (
        <DataQualityColumn
          streamName={item.name}
          quality={item.dataQuality ?? 'good'}
          isLoading={qualityLoading}
        />
      );
    },
  },
  {
    field: 'retentionMs',
    name: RETENTION_COLUMN_HEADER,
    width: '220px',
    sortable: true,
    align: 'left',
    dataType: 'number',
    render: (_: unknown, item: DestinationRow) =>
      item.retention ? (
        <RetentionColumn
          lifecycle={item.retention}
          streamName={item.name}
          aria-label={i18n.translate('xpack.streams.destinationsTable.retentionCellAriaLabel', {
            defaultMessage: 'Retention policy for {name}',
            values: { name: item.name },
          })}
          dataTestSubj={`streamsDestinationsRetention-${item.name}`}
        />
      ) : (
        '-'
      ),
  },
  {
    field: 'streamDefinition',
    name: ACTIONS_COLUMN_HEADER,
    width: '60px',
    align: 'left',
    sortable: false,
    dataType: 'string',
    render: (_: unknown, item: DestinationRow) => (
      <DiscoverBadgeButton
        hasDataStream={item.hasDataStream}
        indexMode={item.indexMode}
        stream={item.streamDefinition}
      />
    ),
  },
];

function ColumnHeader({ label, showWarning }: { label: string; showWarning: boolean }) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {label}
      {showWarning && (
        <EuiIconTip
          content={FAILURE_STORE_PERMISSIONS_ERROR}
          type="warning"
          color="warning"
          size="s"
        />
      )}
    </EuiFlexGroup>
  );
}

function DestinationNameCell({
  destination,
  searchText,
  href,
}: {
  destination: DestinationRow;
  searchText: string;
  href: string;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
      <EuiLink
        href={href}
        data-test-subj={`streamsDestinationsNameLink-${destination.name}`}
        className={css`
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        `}
      >
        <EuiHighlight search={searchText}>{destination.name}</EuiHighlight>
      </EuiLink>
      <EuiText size="xs" color="subdued">
        {destination.description}
      </EuiText>
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        <EuiBadge color="hollow">
          {destination.isInternal ? INTERNAL_BADGE_LABEL : EXTERNAL_BADGE_LABEL}
        </EuiBadge>
        {destination.isManaged && (
          <EuiBadge color="hollow" iconType="logoElastic">
            {MANAGED_BADGE_LABEL}
          </EuiBadge>
        )}
        {destination.tags.map((tag) => (
          <EuiBadge key={tag} color="default">
            {tag}
          </EuiBadge>
        ))}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
