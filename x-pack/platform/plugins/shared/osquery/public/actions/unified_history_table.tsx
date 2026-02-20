/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSkeletonText,
  EuiSelect,
  EuiText,
  EuiToolTip,
  EuiSpacer,
  formatDate,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { removeMultilines } from '../../common/utils/build_query/remove_multilines';
import { useUnifiedHistory } from './use_unified_history';
import { useRouterNavigate } from '../common/lib/kibana';
import type { UnifiedHistoryRow, SourceFilter } from '../../common/api/unified_history/types';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface HistoryDetailsButtonProps {
  row: UnifiedHistoryRow;
}

const HistoryDetailsButton: React.FC<HistoryDetailsButtonProps> = ({ row }) => {
  const path =
    row.rowType === 'scheduled'
      ? `history/scheduled/${row.scheduleId}/${row.executionCount}`
      : `history/${row.actionId}`;

  const navProps = useRouterNavigate(path);

  const detailsText = i18n.translate('xpack.osquery.unifiedHistory.table.viewDetailsButton', {
    defaultMessage: 'Details',
  });

  return (
    <EuiToolTip position="top" content={detailsText} disableScreenReaderOutput>
      <EuiButtonIcon iconType="visTable" {...navProps} aria-label={detailsText} />
    </EuiToolTip>
  );
};

HistoryDetailsButton.displayName = 'HistoryDetailsButton';

interface CursorState {
  actionsCursor?: string;
  scheduledCursor?: string;
  scheduledOffset?: number;
}

const UnifiedHistoryTableComponent = () => {
  const { push } = useHistory();
  const [pageSize, setPageSize] = useState(20);
  const [cursorStack, setCursorStack] = useState<CursorState[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [activeKuery, setActiveKuery] = useState<string | undefined>();
  const [sourceFilters, setSourceFilters] = useState<Set<SourceFilter>>(
    new Set(['live', 'rule', 'scheduled'])
  );
  const [isSourcePopoverOpen, setIsSourcePopoverOpen] = useState(false);

  const currentCursors = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : undefined;

  const toggleSourceFilter = useCallback((filter: SourceFilter) => {
    setSourceFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
    setCursorStack([]);
  }, []);

  // Only pass sourceFilters when not all are selected (i.e. when there's an actual filter)
  const activeSourceFilters =
    sourceFilters.size === 3 ? undefined : Array.from(sourceFilters).join(',');

  const handleSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setActiveKuery(trimmed || undefined);
      setCursorStack([]);
    },
    []
  );

  const { data, isLoading, isFetching } = useUnifiedHistory({
    pageSize,
    actionsCursor: currentCursors?.actionsCursor,
    scheduledCursor: currentCursors?.scheduledCursor,
    scheduledOffset: currentCursors?.scheduledOffset,
    kuery: activeKuery,
    sourceFilters: activeSourceFilters,
  });

  const rows = data?.rows ?? [];
  const hasMore = data?.hasMore ?? false;
  const pageIndex = cursorStack.length;

  const handleNextPage = useCallback(() => {
    if (data?.nextActionsCursor || data?.nextScheduledCursor) {
      setCursorStack((prev) => [
        ...prev,
        {
          actionsCursor: data.nextActionsCursor,
          scheduledCursor: data.nextScheduledCursor,
          scheduledOffset: data.nextScheduledOffset,
        },
      ]);
    }
  }, [data?.nextActionsCursor, data?.nextScheduledCursor, data?.nextScheduledOffset]);

  const handlePrevPage = useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1));
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCursorStack([]);
  }, []);

  const renderQueryColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    const singleLine = removeMultilines(row.queryText || '');
    const content = singleLine.length > 90 ? `${singleLine.substring(0, 90)}...` : singleLine;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow>
          {row.queryName ? (
            content ? (
              <EuiToolTip position="top" content={content}>
                <span>{row.queryName}</span>
              </EuiToolTip>
            ) : (
              <span>{row.queryName}</span>
            )
          ) : (
            <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
              {content}
            </EuiCodeBlock>
          )}
        </EuiFlexItem>
        {row.packName && (
          <EuiFlexItem grow={false}>
            {row.rowType === 'live' ? (
              <EuiToolTip position="top" content={row.packName}>
                <EuiBadge color="hollow" iconType="package" />
              </EuiToolTip>
            ) : (
              <EuiBadge color="hollow" iconType="package">
                {row.packName}
              </EuiBadge>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, []);

  const renderSourceColumn = useCallback((_: unknown, row: UnifiedHistoryRow) => {
    const colorMap: Record<string, string> = {
      Live: 'primary',
      Scheduled: 'accent',
      Rule: 'warning',
    };

    return <EuiBadge color={colorMap[row.source] ?? 'default'}>{row.source}</EuiBadge>;
  }, []);

  const renderAgentsColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{row.agentCount}</>,
    []
  );

  const renderResultsColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{row.totalRows}</>,
    []
  );

  const renderTimestampColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{formatDate(row.timestamp)}</>,
    []
  );

  const renderRunByColumn = useCallback(
    (_: unknown, row: UnifiedHistoryRow) => <>{row.userId ?? '-'}</>,
    []
  );

  const renderActionsColumn = useCallback(
    (row: UnifiedHistoryRow) => <HistoryDetailsButton row={row} />,
    []
  );

  const isPlayAvailable = useCallback((row: UnifiedHistoryRow) => row.rowType === 'live', []);

  const handlePlayClick = useCallback(
    (row: UnifiedHistoryRow) => () => {
      if (row.actionId) {
        push('/new', {
          form: { query: row.queryText },
        });
      }
    },
    [push]
  );

  const renderPlayButton = useCallback(
    (row: UnifiedHistoryRow, enabled: boolean) => {
      const playText = i18n.translate('xpack.osquery.unifiedHistory.table.runQueryAriaLabel', {
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

  const columns: Array<EuiBasicTableColumn<UnifiedHistoryRow>> = useMemo(
    () => [
      {
        field: 'queryText',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        truncateText: true,
        width: '45%',
        render: renderQueryColumn,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.sourceColumnTitle', {
          defaultMessage: 'Source',
        }),
        width: '100px',
        render: renderSourceColumn,
      },
      {
        field: 'agentCount',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '80px',
        render: renderAgentsColumn,
      },
      {
        field: 'totalRows',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.resultsColumnTitle', {
          defaultMessage: 'Results',
        }),
        width: '80px',
        render: renderResultsColumn,
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.timestampColumnTitle', {
          defaultMessage: 'Timestamp',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'userId',
        name: i18n.translate('xpack.osquery.unifiedHistory.table.runByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '150px',
        render: renderRunByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.unifiedHistory.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        actions: [
          {
            available: isPlayAvailable,
            render: renderPlayButton,
          },
          {
            render: renderActionsColumn,
          },
        ],
      },
    ],
    [
      isPlayAvailable,
      renderActionsColumn,
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

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.osquery.unifiedHistory.table.searchPlaceholder', {
              defaultMessage: 'Search by query or pack name',
            })}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            isClearable
            fullWidth
            data-test-subj="unifiedHistorySearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiPopover
              isOpen={isSourcePopoverOpen}
              closePopover={() => setIsSourcePopoverOpen(false)}
              button={
                <EuiFilterButton
                  iconType="arrowDown"
                  isSelected={isSourcePopoverOpen}
                  hasActiveFilters={sourceFilters.size < 3}
                  numActiveFilters={sourceFilters.size < 3 ? sourceFilters.size : 0}
                  onClick={() => setIsSourcePopoverOpen((prev) => !prev)}
                  data-test-subj="sourceFilterButton"
                >
                  {i18n.translate('xpack.osquery.unifiedHistory.filter.source', {
                    defaultMessage: 'Source',
                  })}
                </EuiFilterButton>
              }
            >
              <EuiFilterSelectItem
                checked={sourceFilters.has('live') ? 'on' : undefined}
                onClick={() => toggleSourceFilter('live')}
                data-test-subj="sourceFilterLive"
              >
                {i18n.translate('xpack.osquery.unifiedHistory.filter.live', {
                  defaultMessage: 'Live',
                })}
              </EuiFilterSelectItem>
              <EuiFilterSelectItem
                checked={sourceFilters.has('rule') ? 'on' : undefined}
                onClick={() => toggleSourceFilter('rule')}
                data-test-subj="sourceFilterRule"
              >
                {i18n.translate('xpack.osquery.unifiedHistory.filter.rule', {
                  defaultMessage: 'Rule',
                })}
              </EuiFilterSelectItem>
              <EuiFilterSelectItem
                checked={sourceFilters.has('scheduled') ? 'on' : undefined}
                onClick={() => toggleSourceFilter('scheduled')}
                data-test-subj="sourceFilterScheduled"
              >
                {i18n.translate('xpack.osquery.unifiedHistory.filter.scheduled', {
                  defaultMessage: 'Scheduled',
                })}
              </EuiFilterSelectItem>
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable<UnifiedHistoryRow>
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
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.osquery.unifiedHistory.table.rowsPerPage', {
                  defaultMessage: 'Rows per page:',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={PAGE_SIZE_OPTIONS.map((opt) => ({
                  value: String(opt),
                  text: String(opt),
                }))}
                value={String(pageSize)}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                compressed
                data-test-subj="unifiedHistoryPageSizeSelect"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="arrowLeft"
                onClick={handlePrevPage}
                isDisabled={pageIndex === 0}
                data-test-subj="unifiedHistoryPrevPage"
              >
                {i18n.translate('xpack.osquery.unifiedHistory.table.prevPage', {
                  defaultMessage: 'Previous',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.osquery.unifiedHistory.table.pageIndicator', {
                  defaultMessage: 'Page {page}',
                  values: { page: pageIndex + 1 },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="arrowRight"
                iconSide="right"
                onClick={handleNextPage}
                isDisabled={!hasMore}
                data-test-subj="unifiedHistoryNextPage"
              >
                {i18n.translate('xpack.osquery.unifiedHistory.table.nextPage', {
                  defaultMessage: 'Next',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const UnifiedHistoryTable = React.memo(UnifiedHistoryTableComponent);
UnifiedHistoryTable.displayName = 'UnifiedHistoryTable';
