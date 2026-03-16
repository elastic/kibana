/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiTablePagination,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { QUERY_TIMEOUT } from '../../common/constants';
import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import type {
  UnifiedHistoryRow,
  LiveHistoryRow,
  ScheduledHistoryRow,
  SourceFilter,
} from '../../common/api/unified_history/types';
import { useUnifiedHistory } from './use_unified_history';
import { useCursorPagination } from './use_cursor_pagination';
import { useBulkGetUserProfiles } from './use_user_profiles';
import { useKibana, useRouterNavigate } from '../common/lib/kibana';
import { pagePathGetters } from '../common/page_paths';
import { usePacks } from '../packs/use_packs';
import { RunByColumn } from './components/run_by_column';
import { SourceBadge } from './components/source_column';
import { HistoryFilters, DEFAULT_START_DATE, DEFAULT_END_DATE } from './components/history_filters';
import { usePersistedPageSize, PAGE_SIZE_OPTIONS } from '../common/use_persisted_page_size';

const EMPTY_ARRAY: UnifiedHistoryRow[] = [];
const ITEMS_PER_PAGE_OPTIONS = [...PAGE_SIZE_OPTIONS];

const PACKS_CONFIG = { isLive: false } as const;

const isLiveRow = (row: UnifiedHistoryRow): row is LiveHistoryRow => row.sourceType === 'live';

const isScheduledRow = (row: UnifiedHistoryRow): row is ScheduledHistoryRow =>
  row.sourceType === 'scheduled' && row.scheduleId != null && row.executionCount != null;

interface HistoryDetailsButtonProps {
  row: UnifiedHistoryRow;
}

const HistoryDetailsButton: React.FC<HistoryDetailsButtonProps> = ({ row }) => {
  const path = useMemo(() => {
    if (isScheduledRow(row)) {
      return pagePathGetters.history_scheduled_details({
        scheduleId: row.scheduleId,
        executionCount: String(row.executionCount),
      });
    }

    if (isLiveRow(row) && row.actionId) {
      return pagePathGetters.history_details({ liveQueryId: row.actionId });
    }

    return undefined;
  }, [row]);

  const navProps = useRouterNavigate(path ?? '');

  const detailsText = i18n.translate(
    'xpack.osquery.liveQueryActions.table.viewDetailsActionButton',
    { defaultMessage: 'Details' }
  );

  return (
    <EuiToolTip position="top" content={detailsText} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="visTable"
        {...navProps}
        isDisabled={!path}
        aria-label={detailsText}
      />
    </EuiToolTip>
  );
};

HistoryDetailsButton.displayName = 'HistoryDetailsButton';

const UnifiedHistoryTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { push } = useHistory();

  const [pageSize, setPageSize] = usePersistedPageSize();
  const [searchValue, setSearchValue] = useState('');
  const [selectedSources, setSelectedSources] = useState<SourceFilter[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);

  const { currentCursor, pageIndex, goToNextPage, goToPage, resetPagination } =
    useCursorPagination();

  const {
    data: historyData,
    isLoading,
    isFetching,
    refetch,
  } = useUnifiedHistory({
    pageSize,
    nextPage: currentCursor,
    kuery: searchValue || undefined,
    sourceFilters: selectedSources.length > 0 ? selectedSources : undefined,
    userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
    startDate,
    endDate,
  });

  const rows = useMemo(() => historyData?.data ?? EMPTY_ARRAY, [historyData?.data]);

  const liveRows = useMemo(() => rows.filter(isLiveRow), [rows]);

  const { profilesMap, isLoading: isLoadingProfiles } = useBulkGetUserProfiles(liveRows);

  const handleSearchSubmit = useCallback(
    (value: string) => {
      setSearchValue(value);
      resetPagination();
    },
    [resetPagination]
  );

  const handleSelectedSourcesChanged = useCallback(
    (sources: SourceFilter[]) => {
      setSelectedSources(sources);
      resetPagination();
    },
    [resetPagination]
  );

  const handleSelectedUsersChanged = useCallback(
    (userIds: string[]) => {
      setSelectedUserIds(userIds);
      resetPagination();
    },
    [resetPagination]
  );

  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setStartDate(start);
      setEndDate(end);
      resetPagination();
    },
    [resetPagination]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      resetPagination();
    },
    [setPageSize, resetPagination]
  );

  const handleNextPage = useCallback(() => {
    if (historyData?.nextPage) {
      goToNextPage(historyData.nextPage);
    }
  }, [historyData?.nextPage, goToNextPage]);

  const { data: packsData } = usePacks(PACKS_CONFIG);

  const handlePackBadgeClick = useCallback(
    (packId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      push(pagePathGetters.pack_details({ packId }));
    },
    [push]
  );

  const renderQueryColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => {
      // Scheduled rows: show query name (if available) with pack badge
      if (isScheduledRow(row) && (row.queryName || row.packName)) {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false}>
            <EuiFlexItem grow={false}>{row.queryName ?? row.packName}</EuiFlexItem>
            {row.packName && row.packId && row.queryName && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  iconType="package"
                  color="hollow"
                  onClick={handlePackBadgeClick(row.packId)}
                  onClickAriaLabel={`View pack ${row.packName}`}
                >
                  {row.packName}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      }

      // Live pack rows: show pack name
      if (isLiveRow(row) && row.packName) {
        return <>{row.packName}</>;
      }

      // Single query rows: show truncated SQL
      const singleLine = removeMultilines(row.queryText);
      const content = singleLine.length > 90 ? `${singleLine.substring(0, 90)}...` : singleLine;

      return (
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
          {content}
        </EuiCodeBlock>
      );
    },
    [handlePackBadgeClick]
  );

  const renderSourceColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <SourceBadge source={row.source} />,
    []
  );

  const renderResultsColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    if (isLiveRow(row)) {
      if (row.packName && row.queriesTotal != null) {
        return (
          <>
            {row.queriesWithResults ?? 0} of {row.queriesTotal}
          </>
        );
      }

      return <>{row.totalRows ?? '\u2014'}</>;
    }

    return <>{row.totalRows ?? '\u2014'}</>;
  }, []);

  const renderAgentsColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    if (row.successCount == null && row.errorCount == null) {
      return <>{row.agentCount}</>;
    }

    const success = row.successCount ?? 0;
    const errors = row.errorCount ?? 0;
    const pending = Math.max(0, row.agentCount - success - errors);

    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="success">{success}</EuiBadge>
        </EuiFlexItem>
        {errors > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">{errors}</EuiBadge>
          </EuiFlexItem>
        )}
        {pending > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{pending}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, []);

  const renderTimestampColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{formatDate(row.timestamp)}</>,
    []
  );

  const renderRunByColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => {
      if (!isLiveRow(row)) {
        return <>{'\u2014'}</>;
      }

      return (
        <RunByColumn
          userId={row.userId}
          userProfileUid={row.userProfileUid}
          profilesMap={profilesMap}
          isLoadingProfiles={isLoadingProfiles}
        />
      );
    },
    [profilesMap, isLoadingProfiles]
  );

  const renderDetailsAction = useCallback(
    (row: UnifiedHistoryRow) => <HistoryDetailsButton row={row} />,
    []
  );

  const newQueryPath = '/new';

  const handlePlayClick = useCallback(
    (row: UnifiedHistoryRow) => () => {
      if (!isLiveRow(row)) return;

      if (row.packId) {
        return push(newQueryPath, {
          form: pickBy(
            {
              packId: row.packId,
              agentSelection: {
                agents: row.agentIds,
                allAgentsSelected: row.agentAll,
                platformsSelected: row.agentPlatforms,
                policiesSelected: row.agentPolicyIds,
              },
            },
            (value) => !isEmpty(value)
          ),
        });
      }

      push(newQueryPath, {
        form: pickBy(
          {
            query: row.queryText,
            ecs_mapping: row.ecsMapping,
            savedQueryId: row.savedQueryId,
            timeout: row.timeout ?? QUERY_TIMEOUT.DEFAULT,
            agentSelection: {
              agents: row.agentIds,
              allAgentsSelected: row.agentAll,
              platformsSelected: row.agentPlatforms,
              policiesSelected: row.agentPolicyIds,
            },
          },
          (value) => !isEmpty(value) || isNumber(value)
        ),
      });
    },
    [push]
  );

  const existingPackIds = useMemo(
    () => (packsData?.data ?? []).map((p) => p.saved_object_id),
    [packsData]
  );

  const isPlayButtonAvailable = useCallback(
    (row: UnifiedHistoryRow) => {
      if (!isLiveRow(row)) return false;

      if (row.packId) {
        return (
          existingPackIds.includes(row.packId) &&
          !!permissions.runSavedQueries &&
          !!permissions.readPacks
        );
      }

      return !!(permissions.runSavedQueries || permissions.writeLiveQueries);
    },
    [permissions, existingPackIds]
  );

  const renderPlayButton = useCallback(
    (row: UnifiedHistoryRow, enabled: boolean) => {
      const playText = i18n.translate('xpack.osquery.liveQueryActions.table.runActionAriaLabel', {
        defaultMessage: 'Run query',
      });

      return (
        <EuiToolTip position="top" content={playText} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="play"
            onClick={handlePlayClick(row)}
            isDisabled={!enabled}
            aria-label={playText}
          />
        </EuiToolTip>
      );
    },
    [handlePlayClick]
  );

  const columns = useMemo(
    () => [
      {
        field: 'queryText',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        truncateText: true,
        width: '40%',
        render: renderQueryColumn,
      },
      {
        field: 'totalRows',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.resultsColumnTitle', {
          defaultMessage: 'Results',
        }),
        width: '120px',
        render: renderResultsColumn,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumnTitle', {
          defaultMessage: 'Source',
        }),
        width: '120px',
        render: renderSourceColumn,
      },
      {
        field: 'agentCount',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '120px',
        render: renderAgentsColumn,
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdAtColumnTitle', {
          defaultMessage: 'Created at',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'userId',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '200px',
        render: renderRunByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.liveQueryActions.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        actions: [
          {
            available: isPlayButtonAvailable,
            render: renderPlayButton,
          },
          {
            render: renderDetailsAction,
          },
        ],
      },
    ],
    [
      isPlayButtonAvailable,
      renderDetailsAction,
      renderAgentsColumn,
      renderPlayButton,
      renderQueryColumn,
      renderResultsColumn,
      renderRunByColumn,
      renderSourceColumn,
      renderTimestampColumn,
    ]
  );

  const rowProps = useCallback(
    (row: UnifiedHistoryRow) => ({
      'data-test-subj': `row-${row.id}`,
    }),
    []
  );

  const hasMore = historyData?.hasMore ?? false;

  // pageCount drives the navigation arrows: when hasMore is true we advertise
  // one extra page so the forward arrow stays enabled.
  const pageCount = hasMore ? pageIndex + 2 : pageIndex + 1;

  const handlePageClick = useCallback(
    (newPage: number) => {
      if (newPage > pageIndex && hasMore) {
        handleNextPage();
      } else if (newPage < pageIndex) {
        goToPage(newPage);
      }
    },
    [pageIndex, hasMore, handleNextPage, goToPage]
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <>
      <HistoryFilters
        searchValue={searchValue}
        onSearchSubmit={handleSearchSubmit}
        selectedSources={selectedSources}
        onSelectedSourcesChanged={handleSelectedSourcesChanged}
        selectedUserIds={selectedUserIds}
        onSelectedUsersChanged={handleSelectedUsersChanged}
        startDate={startDate}
        endDate={endDate}
        onTimeChange={handleTimeChange}
        onRefresh={refetch}
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={rows}
        loading={isFetching && !isLoading}
        columns={columns}
        rowProps={rowProps}
        data-test-subj="unifiedHistoryTable"
        tableCaption={i18n.translate('xpack.osquery.unifiedHistory.table.tableCaption', {
          defaultMessage: 'Query history',
        })}
      />
      <EuiSpacer size="m" />
      <EuiTablePagination
        activePage={pageIndex}
        pageCount={pageCount}
        onChangePage={handlePageClick}
        itemsPerPage={pageSize}
        itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
        onChangeItemsPerPage={handlePageSizeChange}
        data-test-subj="unified-history-pagination"
      />
    </>
  );
};

export const UnifiedHistoryTable = React.memo(UnifiedHistoryTableComponent);
UnifiedHistoryTable.displayName = 'UnifiedHistoryTable';
