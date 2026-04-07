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
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTablePagination,
  EuiToolTip,
  formatDate,
} from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  OnRefreshChangeProps,
  OnTimeChangeProps,
  UseEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';

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
import { TagsColumn } from './components/tags_column';
import { TagsFilterPopover } from './components/tags_filter_popover';
import { SourceFilterPopover } from './components/source_filter_popover';
import { RunByFilterPopover } from './components/run_by_filter_popover';
import { TableToolbar } from '../components/table_toolbar';
import { usePersistedPageSize, PAGE_SIZE_OPTIONS } from '../common/use_persisted_page_size';
import { useHistoryUrlParams } from './use_history_url_params';
import type { SortDirection } from './use_history_url_params';

const EMPTY_ARRAY: UnifiedHistoryRow[] = [];
const EMPTY_TAGS: string[] = [];
const ITEMS_PER_PAGE_OPTIONS = [...PAGE_SIZE_OPTIONS];

const PACKS_CONFIG = { isLive: false } as const;

const HISTORY_COLUMNS_STORAGE_KEY = 'osquery:historyColumns';

const ALL_COLUMN_IDS = [
  'query',
  'tags',
  'results',
  'source',
  'agents',
  'created_at',
  'run_by',
] as const;

const COLUMN_CONFIGS = [
  {
    id: 'query',
    label: i18n.translate('xpack.osquery.history.table.queryColumnTitle', {
      defaultMessage: 'Query or Pack',
    }),
  },
  {
    id: 'tags',
    label: i18n.translate('xpack.osquery.history.table.tagsColumnTitle', {
      defaultMessage: 'Tags',
    }),
  },
  {
    id: 'results',
    label: i18n.translate('xpack.osquery.history.table.resultsColumnTitle', {
      defaultMessage: 'Results',
    }),
  },
  {
    id: 'source',
    label: i18n.translate('xpack.osquery.history.table.sourceColumnTitle', {
      defaultMessage: 'Source',
    }),
  },
  {
    id: 'agents',
    label: i18n.translate('xpack.osquery.history.table.agentsColumnTitle', {
      defaultMessage: 'Agents',
    }),
  },
  {
    id: 'created_at',
    label: i18n.translate('xpack.osquery.history.table.createdAtColumnTitle', {
      defaultMessage: 'Created at',
    }),
  },
  {
    id: 'run_by',
    label: i18n.translate('xpack.osquery.history.table.runByColumnTitle', {
      defaultMessage: 'Run by',
    }),
  },
];

const SORT_FIELDS = [
  {
    id: 'created_at',
    label: i18n.translate('xpack.osquery.history.sort.createdAtLabel', {
      defaultMessage: 'Created at',
    }),
  },
];

const SEARCH_PLACEHOLDER = i18n.translate('xpack.osquery.history.searchPlaceholder', {
  defaultMessage: 'Search by query or pack name',
});

const datePickerCss = css`
  min-width: 300px;
  max-width: 500px;
`;

const separatorCss = ({ euiTheme }: UseEuiTheme) => ({ color: euiTheme.colors.subduedText });
const UPDATE_BUTTON_PROPS = { fill: false };
const badgePaddingCss = { padding: '0 6px' };

const isLiveRow = (row: UnifiedHistoryRow): row is LiveHistoryRow => row.sourceType === 'live';

const isScheduledRow = (row: UnifiedHistoryRow): row is ScheduledHistoryRow =>
  row.sourceType === 'scheduled' && row.scheduleId != null && row.executionCount != null;

interface HistoryDetailsButtonProps {
  row: UnifiedHistoryRow;
}

const HistoryDetailsButton: React.FC<HistoryDetailsButtonProps> = ({ row }) => {
  const { push } = useHistory();

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

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (path) {
        push(path, { fromHistory: true });
      }
    },
    [push, path]
  );

  const navProps = useRouterNavigate(path ?? '', handleClick);

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

  const [storedColumns, setStoredColumns] = useLocalStorage<string[]>(HISTORY_COLUMNS_STORAGE_KEY, [
    ...ALL_COLUMN_IDS,
  ]);
  const visibleColumns = useMemo(() => storedColumns ?? [...ALL_COLUMN_IDS], [storedColumns]);
  const [isPaused, setIsPaused] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const [persistedPageSize, setPersistedPageSize] = usePersistedPageSize();
  const {
    filters: {
      q: searchValue,
      sources: selectedSources,
      runBy: selectedUserIds,
      start: startDate,
      end: endDate,
      pageSize: urlPageSize,
      tags: selectedTags,
      sortDirection,
    },
    setFilter,
    setFilters,
  } = useHistoryUrlParams();

  const pageSize = urlPageSize ?? persistedPageSize;

  const { currentCursor, pageIndex, goToNextPage, goToPage, resetPagination } =
    useCursorPagination();

  const {
    data: historyData,
    isLoading,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useUnifiedHistory({
    pageSize,
    nextPage: currentCursor,
    kuery: searchValue || undefined,
    sourceFilters: selectedSources.length > 0 ? selectedSources : undefined,
    userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    startDate,
    endDate,
    sortDirection,
  });

  const rows = useMemo(() => historyData?.data ?? EMPTY_ARRAY, [historyData?.data]);

  const liveRows = useMemo(() => rows.filter(isLiveRow), [rows]);

  const { profilesMap, isLoading: isLoadingProfiles } = useBulkGetUserProfiles(liveRows);

  const handleSearchSubmit = useCallback(
    (value: string) => {
      setFilter('q', value);
      resetPagination();
    },
    [setFilter, resetPagination]
  );

  const handleSelectedSourcesChanged = useCallback(
    (sources: SourceFilter[]) => {
      setFilter('sources', sources);
      resetPagination();
    },
    [setFilter, resetPagination]
  );

  const handleSelectedUsersChanged = useCallback(
    (userIds: string[]) => {
      setFilter('runBy', userIds);
      resetPagination();
    },
    [setFilter, resetPagination]
  );

  const handleSelectedTagsChanged = useCallback(
    (newTags: string[]) => {
      setFilter('tags', newTags);
      resetPagination();
    },
    [setFilter, resetPagination]
  );

  const handleTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      setFilters({ start, end });
      resetPagination();
    },
    [setFilters, resetPagination]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRefreshChange = useCallback(
    ({ isPaused: paused, refreshInterval: interval }: Partial<OnRefreshChangeProps>) => {
      if (paused !== undefined) setIsPaused(paused);
      if (interval !== undefined) setRefreshInterval(interval);
    },
    []
  );

  const handleSortChange = useCallback(
    (_field: string, direction: SortDirection) => {
      setFilter('sortDirection', direction);
      resetPagination();
    },
    [setFilter, resetPagination]
  );

  const handleVisibleColumnsChange = useCallback(
    (columnIds: string[]) => {
      setStoredColumns(columnIds);
    },
    [setStoredColumns]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPersistedPageSize(size);
      setFilter('pageSize', size);
      resetPagination();
    },
    [setPersistedPageSize, setFilter, resetPagination]
  );

  const handleNextPage = useCallback(() => {
    if (historyData?.nextPage) {
      goToNextPage(historyData.nextPage);
    }
  }, [historyData?.nextPage, goToNextPage]);

  const { data: packsData } = usePacks(PACKS_CONFIG);

  // Empty deps: callback derives output solely from the row argument and module-level helpers
  const renderQueryColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    // Scheduled rows: show query name with pack badge
    if (isScheduledRow(row) && (row.queryName || row.packName)) {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{row.queryName ?? row.packName}</EuiFlexItem>
          {row.packName && row.queryName && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="package">
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
  }, []);

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

    const badges: Array<{ key: string; color: string; count: number }> = [];
    if (success > 0) badges.push({ key: 'success', color: 'success', count: success });
    if (errors > 0) badges.push({ key: 'errors', color: 'danger', count: errors });
    if (pending > 0) badges.push({ key: 'pending', color: 'hollow', count: pending });

    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        {badges.map(({ key, color, count }, idx) => (
          <React.Fragment key={key}>
            {idx > 0 && (
              <EuiFlexItem grow={false}>
                <span css={separatorCss}>/</span>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiBadge color={color} css={badgePaddingCss}>
                {count}
              </EuiBadge>
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    );
  }, []);

  const renderTimestampColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{formatDate(row.timestamp)}</>,
    []
  );

  const renderTagsColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    if (!isLiveRow(row)) {
      return <>{'\u2014'}</>;
    }

    return <TagsColumn tags={row.tags ?? EMPTY_TAGS} />;
  }, []);

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

  const newQueryPath = '/new';

  const handlePlayClick = useCallback(
    (row: UnifiedHistoryRow) => () => {
      if (!isLiveRow(row)) return;

      if (row.packId) {
        return push(newQueryPath, {
          fromHistory: true,
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
        fromHistory: true,
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

  const renderActionsColumn = useCallback(
    (row: UnifiedHistoryRow) => {
      const playText = i18n.translate('xpack.osquery.liveQueryActions.table.runActionAriaLabel', {
        defaultMessage: 'Run query',
      });

      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {isPlayButtonAvailable(row) && (
            <EuiFlexItem grow={false}>
              <EuiToolTip position="top" content={playText} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="play"
                  onClick={handlePlayClick(row)}
                  aria-label={playText}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <HistoryDetailsButton row={row} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [handlePlayClick, isPlayButtonAvailable]
  );

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const columns = useMemo(() => {
    const cols: Array<EuiBasicTableColumn<UnifiedHistoryRow>> = [
      {
        name: i18n.translate('xpack.osquery.liveQueryActions.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
        render: renderActionsColumn,
        css: { '.euiTableCellContent': { paddingRight: 0 } },
      },
    ];

    if (visibleSet.has('query')) {
      cols.push({
        field: 'queryText',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.queryOrPackColumnTitle', {
          defaultMessage: 'Query or Pack',
        }),
        width: '42%',
        render: renderQueryColumn,
      });
    }

    if (visibleSet.has('tags')) {
      cols.push({
        field: 'tags',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.tagsColumnTitle', {
          defaultMessage: 'Tags',
        }),
        width: '7%',
        render: renderTagsColumn,
      });
    }

    if (visibleSet.has('results')) {
      cols.push({
        field: 'totalRows',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.resultsColumnTitle', {
          defaultMessage: 'Results',
        }),
        width: '7%',
        render: renderResultsColumn,
      });
    }

    if (visibleSet.has('source')) {
      cols.push({
        field: 'source',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.sourceColumnTitle', {
          defaultMessage: 'Source',
        }),
        width: '7%',
        render: renderSourceColumn,
      });
    }

    if (visibleSet.has('agents')) {
      cols.push({
        field: 'agentCount',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '10%',
        render: renderAgentsColumn,
      });
    }

    if (visibleSet.has('created_at')) {
      cols.push({
        field: 'timestamp',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdAtColumnTitle', {
          defaultMessage: 'Created at',
        }),
        width: '14%',
        render: renderTimestampColumn,
      });
    }

    if (visibleSet.has('run_by')) {
      cols.push({
        field: 'userId',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '13%',
        render: renderRunByColumn,
      });
    }

    return cols;
  }, [
    visibleSet,
    renderActionsColumn,
    renderAgentsColumn,
    renderQueryColumn,
    renderResultsColumn,
    renderRunByColumn,
    renderSourceColumn,
    renderTagsColumn,
    renderTimestampColumn,
  ]);

  const rowProps = useCallback(
    (row: UnifiedHistoryRow) => ({
      'data-test-subj': `row-${row.id}`,
    }),
    []
  );

  const hasMore = (historyData?.hasMore ?? false) && !isPlaceholderData;

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

  const additionalFilters = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m" responsive={false} wrap alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <TagsFilterPopover
              selectedTags={selectedTags}
              onSelectedTagsChanged={handleSelectedTagsChanged}
            />
            <SourceFilterPopover
              selectedSources={selectedSources}
              onSelectedSourcesChanged={handleSelectedSourcesChanged}
            />
            <RunByFilterPopover
              selectedUserIds={selectedUserIds}
              onSelectedUsersChanged={handleSelectedUsersChanged}
              enabled
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={datePickerCss}>
          <EuiSuperDatePicker
            start={startDate}
            end={endDate}
            onTimeChange={handleTimeChange}
            onRefresh={handleRefresh}
            isPaused={isPaused}
            refreshInterval={refreshInterval}
            onRefreshChange={handleRefreshChange}
            updateButtonProps={UPDATE_BUTTON_PROPS}
            data-test-subj="history-date-picker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [
      selectedTags,
      handleSelectedTagsChanged,
      selectedSources,
      handleSelectedSourcesChanged,
      selectedUserIds,
      handleSelectedUsersChanged,
      startDate,
      endDate,
      handleTimeChange,
      handleRefresh,
      isPaused,
      refreshInterval,
      handleRefreshChange,
    ]
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <>
      <TableToolbar
        searchPlaceholder={SEARCH_PLACEHOLDER}
        searchValue={searchValue}
        onSearchSubmit={handleSearchSubmit}
        additionalFilters={additionalFilters}
        columnConfigs={COLUMN_CONFIGS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        sortFields={SORT_FIELDS}
        sortField="created_at"
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        data-test-subj="history-toolbar"
      />
      <EuiSpacer size="s" />
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
