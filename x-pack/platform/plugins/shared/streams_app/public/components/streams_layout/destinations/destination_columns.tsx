/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridCellProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiHighlight,
  EuiIconTip,
  EuiLink,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
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
import type { SortableField } from './build_destination_rows';
import { ShowOnCanvasButton } from './show_on_canvas_button';
import {
  ACTIONS_COLUMN_HEADER,
  DATA_QUALITY_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
  EXTERNAL_BADGE_LABEL,
  FAILURE_STORE_PERMISSIONS_ERROR,
  INTERNAL_BADGE_LABEL,
  MANAGED_BADGE_LABEL,
  NAME_COLUMN_HEADER,
  RESET_COLUMN_WIDTH_LABEL,
  RETENTION_COLUMN_HEADER,
  STORAGE_COLUMN_HEADER,
  THROUGHPUT_COLUMN_HEADER,
} from './translations';
import type { DestinationRow } from './types';

const EMPTY_CELL = '-';

/** Column order the grid falls back to before the user hides or reorders any. */
export const DEFAULT_VISIBLE_COLUMNS: SortableField[] = [
  'name',
  'documentsCount',
  'ingestionRate',
  'storageBytes',
  'dataQuality',
  'retentionMs',
];

const COLUMN_ACTIONS = { showMoveLeft: false, showMoveRight: false } as const;

const DEFAULT_COLUMN_WIDTHS: Record<SortableField, number> = {
  name: 320,
  documentsCount: 180,
  ingestionRate: 128,
  storageBytes: 120,
  dataQuality: 140,
  retentionMs: 180,
};

const getFlexibleColumnId = (
  visibleColumns: string[],
  columnWidths: Record<string, number>
): SortableField | undefined => {
  const ordered = DEFAULT_VISIBLE_COLUMNS.filter((id) => visibleColumns.includes(id));

  if (ordered.includes('name') && columnWidths.name === undefined) {
    return 'name';
  }

  const unsized = ordered.filter((id) => columnWidths[id] === undefined);

  return unsized[unsized.length - 1] ?? ordered[ordered.length - 1];
};

export interface DestinationColumnsDeps {
  hasFailureStoreAccess: boolean;
  docCountsLoaded: boolean;
  ingestionLoaded: boolean;
  ingestionError: boolean;
  storageLoaded: boolean;
  qualityLoaded: boolean;
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  onResetColumnWidth: (columnId: string) => void;
}

export const createDestinationColumns = ({
  hasFailureStoreAccess,
  docCountsLoaded,
  ingestionLoaded,
  ingestionError,
  storageLoaded,
  qualityLoaded,
  visibleColumns,
  columnWidths,
  onResetColumnWidth,
}: DestinationColumnsDeps): EuiDataGridColumn[] => {
  const flexibleColumnId = getFlexibleColumnId(visibleColumns, columnWidths);

  const sizing = (id: SortableField) =>
    id === flexibleColumnId ? {} : { initialWidth: columnWidths[id] ?? DEFAULT_COLUMN_WIDTHS[id] };

  const actions = (id: SortableField) =>
    columnWidths[id] === undefined
      ? COLUMN_ACTIONS
      : {
          ...COLUMN_ACTIONS,
          additional: [
            {
              label: RESET_COLUMN_WIDTH_LABEL,
              iconType: 'refresh',
              iconProps: { size: 'm' as const },
              onClick: () => onResetColumnWidth(id),
              'data-test-subj': `streamsDestinationsResetColumnWidth-${id}`,
            },
          ],
        };

  return [
    {
      id: 'name',
      displayAsText: NAME_COLUMN_HEADER,
      display: <ColumnHeader label={NAME_COLUMN_HEADER} />,
      isSortable: true,
      isExpandable: false,
      actions: actions('name'),
      ...sizing('name'),
    },
    {
      id: 'documentsCount',
      displayAsText: DOCUMENTS_COLUMN_HEADER,
      display: (
        <ColumnHeader label={DOCUMENTS_COLUMN_HEADER} showWarning={!hasFailureStoreAccess} />
      ),
      isSortable: docCountsLoaded,
      isExpandable: false,
      actions: actions('documentsCount'),
      ...sizing('documentsCount'),
    },
    {
      id: 'ingestionRate',
      displayAsText: THROUGHPUT_COLUMN_HEADER,
      display: <ColumnHeader label={THROUGHPUT_COLUMN_HEADER} />,
      isSortable: ingestionLoaded && !ingestionError,
      isExpandable: false,
      actions: actions('ingestionRate'),
      ...sizing('ingestionRate'),
    },
    {
      id: 'storageBytes',
      displayAsText: STORAGE_COLUMN_HEADER,
      display: <ColumnHeader label={STORAGE_COLUMN_HEADER} />,
      isSortable: storageLoaded,
      isExpandable: false,
      actions: actions('storageBytes'),
      ...sizing('storageBytes'),
    },
    {
      id: 'dataQuality',
      displayAsText: DATA_QUALITY_COLUMN_HEADER,
      display: (
        <ColumnHeader label={DATA_QUALITY_COLUMN_HEADER} showWarning={!hasFailureStoreAccess} />
      ),
      isSortable: qualityLoaded,
      isExpandable: false,
      actions: actions('dataQuality'),
      ...sizing('dataQuality'),
    },
    {
      id: 'retentionMs',
      displayAsText: RETENTION_COLUMN_HEADER,
      display: <ColumnHeader label={RETENTION_COLUMN_HEADER} />,
      isSortable: true,
      isExpandable: false,
      actions: actions('retentionMs'),
      ...sizing('retentionMs'),
    },
  ];
};

export interface DestinationCellRendererDeps {
  rows: DestinationRow[];
  searchText: string;
  getDestinationHref: (destinationName: string) => string;
  getStreamHistogram: ReturnType<typeof useStreamDocCountsFetch>['getStreamHistogram'];
  timeState: ReturnType<typeof useTimefilter>['timeState'];
  ingestionLoaded: boolean;
  ingestionError: boolean;
  storageLoaded: boolean;
  qualityLoading: boolean;
}

export const createDestinationCellRenderer = ({
  rows,
  searchText,
  getDestinationHref,
  getStreamHistogram,
  timeState,
  ingestionLoaded,
  ingestionError,
  storageLoaded,
  qualityLoading,
}: DestinationCellRendererDeps): EuiDataGridCellProps['renderCellValue'] =>
  function DestinationCell({ rowIndex, columnId }) {
    const row = rows[rowIndex];

    if (!row) {
      return null;
    }

    switch (columnId) {
      case 'name':
        return (
          <DestinationNameCell
            destination={row}
            searchText={searchText}
            href={getDestinationHref(row.name)}
          />
        );

      case 'documentsCount':
        return row.hasDataStream ? (
          <DocumentsColumn
            indexPattern={row.name}
            histogramQueryFetch={getStreamHistogram(row.name)}
            timeState={timeState}
            numDataPoints={STREAMS_HISTOGRAM_NUM_DATA_POINTS}
          />
        ) : null;

      case 'ingestionRate':
        return row.hasDataStream ? (
          <IngestionColumn
            rate={row.ingestionRate}
            isLoading={!ingestionLoaded}
            hasError={ingestionError}
          />
        ) : (
          <>{EMPTY_CELL}</>
        );

      case 'storageBytes':
        return row.hasDataStream ? (
          <StorageColumn sizeBytes={row.storageBytes} isLoading={!storageLoaded} />
        ) : (
          <>{EMPTY_CELL}</>
        );

      case 'dataQuality':
        if (!row.hasDataStream || (row.dataQuality === undefined && !qualityLoading)) {
          return <>{EMPTY_CELL}</>;
        }
        return (
          <DataQualityColumn
            streamName={row.name}
            quality={row.dataQuality ?? 'good'}
            isLoading={qualityLoading}
          />
        );

      case 'retentionMs':
        return row.retention ? (
          <RetentionColumn
            lifecycle={row.retention}
            streamName={row.name}
            aria-label={i18n.translate('xpack.streams.destinationsTable.retentionCellAriaLabel', {
              defaultMessage: 'Retention policy for {name}',
              values: { name: row.name },
            })}
            dataTestSubj={`streamsDestinationsRetention-${row.name}`}
          />
        ) : (
          <>{EMPTY_CELL}</>
        );

      default:
        return null;
    }
  };

export const createDestinationActionsColumn = ({
  rows,
  canvasDestinationNames,
  onShowOnCanvas,
}: {
  rows: DestinationRow[];
  canvasDestinationNames: Set<string>;
  onShowOnCanvas: (destinationName: string) => void;
}): EuiDataGridControlColumn => ({
  id: 'destinationActions',
  width: 96,
  headerCellRender: () => (
    <EuiScreenReaderOnly>
      <span>{ACTIONS_COLUMN_HEADER}</span>
    </EuiScreenReaderOnly>
  ),
  rowCellRender: ({ rowIndex }) => {
    const row = rows[rowIndex];

    if (!row) {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <ShowOnCanvasButton
          destinationName={row.name}
          isOnCanvas={canvasDestinationNames.has(row.name)}
          onClick={onShowOnCanvas}
        />
        <DiscoverBadgeButton
          hasDataStream={row.hasDataStream}
          indexMode={row.indexMode}
          stream={row.streamDefinition}
        />
      </EuiFlexGroup>
    );
  },
});

/**
 * The grid renders header cells bold; the design matches the toolbar controls,
 * which sit at the medium weight every EUI button uses.
 */
function ColumnHeader({ label, showWarning = false }: { label: string; showWarning?: boolean }) {
  const { euiTheme } = useEuiTheme();

  const text = (
    <span
      className={css`
        font-weight: ${euiTheme.font.weight.medium};
        overflow: hidden;
        text-overflow: ellipsis;
      `}
    >
      {label}
    </span>
  );

  if (!showWarning) {
    return text;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {text}
      <EuiIconTip
        content={FAILURE_STORE_PERMISSIONS_ERROR}
        type="warning"
        color="warning"
        size="s"
      />
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
      {destination.description && (
        <EuiText size="xs" color="subdued">
          {destination.description}
        </EuiText>
      )}
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
