/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  formatNumber,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import type {
  ResolvedDestinationIndex,
  ResolvedDestinationIndexHealth,
} from '@kbn/streams-plugin/common';
import { IngestionColumn } from '../../stream_list_view/ingestion_column';
import { RetentionColumn } from '../../stream_list_view/retention_column';
import { StorageColumn } from '../../stream_list_view/storage_column';
import {
  DATA_QUALITY_COLUMN_HEADER,
  DATA_QUALITY_DEGRADED_LABEL,
  DATA_QUALITY_FILTER_LABEL,
  DATA_QUALITY_GOOD_LABEL,
  DATA_QUALITY_POOR_LABEL,
  DOCUMENTS_COLUMN_HEADER,
  INGESTION_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER_ARIA_LABEL,
  STORAGE_COLUMN_HEADER,
} from '../../stream_list_view/translations';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { SourceFilter, type SourceFilterOption } from '../sources/source_filter';
import {
  buildDestinationIndexRows,
  sortDestinationIndexRows,
  type DestinationIndexRow,
  type DestinationIndexSort,
  type DestinationIndexSortField,
  type DestinationIndexStatsTimeRange,
} from './destination_index_stats';
import { useDestinationIndexStats } from './destinations_context';
import type { DestinationDetailActorRef } from './state_machines/destination_detail_state_machine';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
// The index name takes the spare width; stat columns keep a fixed width and never wrap.
const STAT_COLUMN_WIDTH = '120px';
const noWrapStyles = css`
  white-space: nowrap;
`;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_SORT: DestinationIndexSort = { field: 'name', direction: 'asc' };

const DATA_STREAM_ONLY_TOOLTIP = i18n.translate(
  'xpack.streams.destinations.indices.dataStreamOnlyTooltip',
  { defaultMessage: 'Only available for data streams.' }
);

const QUALITY_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.streams.destinations.indices.qualityUnavailableTooltip',
  {
    defaultMessage:
      "Data quality is unavailable because one or more required statistics couldn't be loaded.",
  }
);

const STATS_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.streams.destinations.indices.statsUnavailableTooltip',
  { defaultMessage: 'Unable to load this value.' }
);

const HEALTH_COLORS: Record<ResolvedDestinationIndexHealth, 'success' | 'warning' | 'danger'> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
};

const HEALTH_LABELS: Record<ResolvedDestinationIndexHealth, string> = {
  green: i18n.translate('xpack.streams.destinations.indices.healthGreenLabel', {
    defaultMessage: 'Green',
  }),
  yellow: i18n.translate('xpack.streams.destinations.indices.healthYellowLabel', {
    defaultMessage: 'Yellow',
  }),
  red: i18n.translate('xpack.streams.destinations.indices.healthRedLabel', {
    defaultMessage: 'Red',
  }),
};

const QUALITY_FILTER_OPTIONS: Array<SourceFilterOption<QualityIndicators>> = [
  { key: 'good', label: DATA_QUALITY_GOOD_LABEL },
  { key: 'degraded', label: DATA_QUALITY_DEGRADED_LABEL },
  { key: 'poor', label: DATA_QUALITY_POOR_LABEL },
];

const UnavailableValue = ({
  tooltip,
  dataTestSubj = 'streamsDestinationIndexValueUnavailable',
}: {
  tooltip: string;
  dataTestSubj?: string;
}) => (
  <EuiToolTip content={tooltip}>
    <span tabIndex={0} data-test-subj={dataTestSubj}>
      -
    </span>
  </EuiToolTip>
);

const DataStreamOnlyValue = () => (
  <UnavailableValue
    tooltip={DATA_STREAM_ONLY_TOOLTIP}
    dataTestSubj="streamsDestinationIndexDataStreamOnly"
  />
);

const isModifiedClick = (event: React.MouseEvent): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

interface DestinationIndicesTableProps {
  destinationId: string;
  indices: ResolvedDestinationIndex[];
  indicesStatus: ResolvedIndicesStatus;
  indicesError?: string;
  destinationDetailRef?: DestinationDetailActorRef;
  /** Called on mount and whenever the time range or the indices change. */
  onRequestStats: (destinationId: string, timeRange: DestinationIndexStatsTimeRange) => void;
  /** Opens an index in place. When omitted, index links navigate to the index page. */
  onIndexClick?: (indexName: string) => void;
  /** Search and data quality filter above the table. */
  showToolbar?: boolean;
}

/** Paginated, sortable list of a destination's indices with their stats. */
export const DestinationIndicesTable = ({
  destinationId,
  indices,
  indicesStatus,
  indicesError,
  destinationDetailRef,
  onRequestStats,
  onIndexClick,
  showToolbar = false,
}: DestinationIndicesTableProps) => {
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    timeState: { start, end },
  } = useTimefilter();
  const { stats, status: statsStatus } = useDestinationIndexStats(destinationDetailRef);
  const [query, setQuery] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<QualityIndicators[]>([]);
  const [sort, setSort] = useState<DestinationIndexSort>(DEFAULT_SORT);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });

  useEffect(() => {
    if (indicesStatus !== 'loading') {
      onRequestStats(destinationId, { start, end });
    }
  }, [destinationId, indices, indicesStatus, onRequestStats, start, end]);

  const isStatsLoading = statsStatus === 'loading';
  const isStatsFailed = statsStatus === 'failed';

  const rows = useMemo(() => buildDestinationIndexRows(indices, stats), [indices, stats]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!normalizedQuery || row.name.toLowerCase().includes(normalizedQuery)) &&
        (selectedQualities.length === 0 ||
          (row.quality !== undefined && selectedQualities.includes(row.quality)))
    );
  }, [query, rows, selectedQualities]);
  const sortedRows = useMemo(
    () => sortDestinationIndexRows(filteredRows, sort),
    [filteredRows, sort]
  );
  const pageIndex = Math.min(
    pagination.pageIndex,
    Math.max(0, Math.ceil(sortedRows.length / pagination.pageSize) - 1)
  );
  const pageRows = useMemo(
    () => sortedRows.slice(pageIndex * pagination.pageSize, (pageIndex + 1) * pagination.pageSize),
    [pageIndex, pagination.pageSize, sortedRows]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DestinationIndexRow>>>(() => {
    const indexLinkProps = (indexName: string, tab: 'overview' | 'quality') => ({
      href: router.link('/new-experience/indices/{indexName}/{tab}', {
        path: { indexName, tab },
        query: { rangeFrom, rangeTo },
      }),
      onClick: (event: React.MouseEvent) => {
        if (isModifiedClick(event)) {
          return;
        }
        event.preventDefault();
        if (onIndexClick && tab === 'overview') {
          onIndexClick(indexName);
          return;
        }
        router.push('/new-experience/indices/{indexName}/{tab}', {
          path: { indexName, tab },
          query: { rangeFrom, rangeTo },
        });
      },
    });

    const renderStat = (
      row: DestinationIndexRow,
      value: number | undefined,
      render: (knownValue: number) => React.ReactNode
    ) => {
      if (!row.isDataStream) {
        return <DataStreamOnlyValue />;
      }
      if (isStatsLoading) {
        return <EuiLoadingSpinner size="s" />;
      }
      if (value === undefined || isStatsFailed) {
        return <EuiIconTip type="warning" color="warning" content={STATS_UNAVAILABLE_TOOLTIP} />;
      }
      return <span css={noWrapStyles}>{render(value)}</span>;
    };

    return [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.destinations.indices.nameColumnLabel', {
          defaultMessage: 'Index name',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string) => (
          <EuiLink
            data-test-subj="streamsDestinationIndexLink"
            {...indexLinkProps(name, 'overview')}
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'documents',
        name: DOCUMENTS_COLUMN_HEADER,
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (documents: number | undefined, row: DestinationIndexRow) =>
          renderStat(row, documents, (value) => formatNumber(value, '0,0')),
      },
      {
        field: 'throughput',
        name: INGESTION_COLUMN_HEADER,
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (throughput: number | undefined, row: DestinationIndexRow) =>
          renderStat(row, throughput, (value) => (
            <IngestionColumn rate={value} isLoading={false} />
          )),
      },
      {
        field: 'storageBytes',
        name: STORAGE_COLUMN_HEADER,
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (storageBytes: number | undefined, row: DestinationIndexRow) =>
          renderStat(row, storageBytes, (value) => (
            <StorageColumn sizeBytes={value} isLoading={false} />
          )),
      },
      {
        field: 'health',
        name: i18n.translate('xpack.streams.destinations.indices.healthColumnLabel', {
          defaultMessage: 'Health',
        }),
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (health: ResolvedDestinationIndexHealth | undefined, row: DestinationIndexRow) => {
          if (!row.isDataStream) {
            return <DataStreamOnlyValue />;
          }
          return health ? (
            <EuiHealth color={HEALTH_COLORS[health]} textSize="s" css={noWrapStyles}>
              {HEALTH_LABELS[health]}
            </EuiHealth>
          ) : (
            '-'
          );
        },
      },
      {
        field: 'quality',
        name: DATA_QUALITY_COLUMN_HEADER,
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (quality: QualityIndicators | undefined, row: DestinationIndexRow) => {
          if (!row.isDataStream) {
            return <DataStreamOnlyValue />;
          }
          if (isStatsFailed) {
            return (
              <EuiIconTip type="warning" color="warning" content={STATS_UNAVAILABLE_TOOLTIP} />
            );
          }
          if (!quality && !isStatsLoading) {
            return <UnavailableValue tooltip={QUALITY_UNAVAILABLE_TOOLTIP} />;
          }
          return (
            <EuiLink
              data-test-subj={`streamsDataQualityLink-${row.name}`}
              {...indexLinkProps(row.name, 'quality')}
            >
              <DatasetQualityIndicator
                dataTestSubj={`dataQualityIndicator-${row.name}`}
                quality={quality ?? 'good'}
                isLoading={isStatsLoading}
                showTooltip={true}
              />
            </EuiLink>
          );
        },
      },
      {
        field: 'failureStoreEnabled',
        name: i18n.translate('xpack.streams.destinations.indices.failureStoreColumnLabel', {
          defaultMessage: 'Failure store',
        }),
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (failureStoreEnabled: boolean | undefined, row: DestinationIndexRow) => {
          if (!row.isDataStream) {
            return <DataStreamOnlyValue />;
          }
          return failureStoreEnabled
            ? i18n.translate('xpack.streams.destinations.indices.failureStoreOnLabel', {
                defaultMessage: 'On',
              })
            : i18n.translate('xpack.streams.destinations.indices.failureStoreOffLabel', {
                defaultMessage: 'Off',
              });
        },
      },
      {
        field: 'retentionMs',
        name: (
          <span aria-label={RETENTION_COLUMN_HEADER_ARIA_LABEL}>{RETENTION_COLUMN_HEADER}</span>
        ),
        sortable: true,
        align: 'right',
        width: STAT_COLUMN_WIDTH,
        render: (_retentionMs: number, row: DestinationIndexRow) =>
          row.lifecycle ? (
            <span css={noWrapStyles}>
              <RetentionColumn
                lifecycle={row.lifecycle}
                streamName={row.name}
                dataTestSubj={`destinationIndexRetention-${row.name}`}
              />
            </span>
          ) : (
            <DataStreamOnlyValue />
          ),
      },
    ];
  }, [isStatsFailed, isStatsLoading, onIndexClick, rangeFrom, rangeTo, router]);

  const onTableChange = ({ sort: nextSort, page }: CriteriaWithPagination<DestinationIndexRow>) => {
    if (nextSort) {
      setSort({
        field: nextSort.field as DestinationIndexSortField,
        direction: nextSort.direction,
      });
    }
    setPagination({ pageIndex: page.index, pageSize: page.size });
  };

  if (indicesStatus === 'loading' && indices.length === 0) {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj="streamsDestinationIndicesLoading"
      >
        <EuiLoadingSpinner size="m" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.streams.destinations.indices.loadingDescription"
            defaultMessage="Loading indices"
          />
        </EuiText>
      </EuiFlexGroup>
    );
  }

  if (indicesStatus === 'unavailable') {
    return (
      <EuiText size="s" color="danger" data-test-subj="streamsDestinationIndicesError">
        <p>
          {indicesError ??
            i18n.translate('xpack.streams.destinations.indices.loadFailedDescription', {
              defaultMessage: 'Could not load indices for this destination.',
            })}
        </p>
      </EuiText>
    );
  }

  if (indices.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="streamsDestinationIndicesEmpty">
        <p>
          <FormattedMessage
            id="xpack.streams.destinations.indices.emptyDescription"
            defaultMessage="No indices match this destination's write scope yet."
          />
        </p>
      </EuiText>
    );
  }

  return (
    <div data-test-subj="streamsDestinationIndicesTable">
      {showToolbar && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                compressed
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                placeholder={i18n.translate(
                  'xpack.streams.destinations.indices.searchPlaceholder',
                  { defaultMessage: 'Search indices' }
                )}
                aria-label={i18n.translate('xpack.streams.destinations.indices.searchAriaLabel', {
                  defaultMessage: 'Search indices',
                })}
                data-test-subj="streamsDestinationIndicesSearch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup compressed>
                <SourceFilter
                  label={DATA_QUALITY_FILTER_LABEL}
                  options={QUALITY_FILTER_OPTIONS}
                  selectedValues={selectedQualities}
                  onChange={(qualities) => {
                    setSelectedQualities(qualities);
                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                  }}
                />
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiBasicTable
        compressed
        responsiveBreakpoint={false}
        tableLayout="fixed"
        tableCaption={i18n.translate('xpack.streams.destinations.indices.tableCaption', {
          defaultMessage: 'Indices targeted by this destination',
        })}
        items={pageRows}
        itemId="name"
        columns={columns}
        sorting={{ sort }}
        pagination={{
          pageIndex,
          pageSize: pagination.pageSize,
          totalItemCount: sortedRows.length,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        onChange={onTableChange}
        noItemsMessage={i18n.translate(
          'xpack.streams.destinations.indices.noSearchMatchesDescription',
          { defaultMessage: 'No indices match your search.' }
        )}
      />
    </div>
  );
};
