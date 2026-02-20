/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonEmpty,
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
  EuiSpacer,
} from '@elastic/eui';
import React, { useState, useCallback } from 'react';

import { useUnifiedHistory } from './use_unified_history';
import { useCursorPagination } from './use_cursor_pagination';
import { useUnifiedHistoryColumns } from './unified_history_columns';
import type { UnifiedHistoryRow, SourceFilter } from '../../common/api/unified_history/types';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const UnifiedHistoryTableComponent = () => {
  const [searchValue, setSearchValue] = useState('');
  const [activeKuery, setActiveKuery] = useState<string | undefined>();
  const [sourceFilters, setSourceFilters] = useState<Set<SourceFilter>>(
    new Set(['live', 'rule', 'scheduled'])
  );
  const [isSourcePopoverOpen, setIsSourcePopoverOpen] = useState(false);

  const {
    pageSize,
    pageIndex,
    currentCursors,
    handleNextPage,
    handlePrevPage,
    handlePageSizeChange,
    resetCursors,
  } = useCursorPagination(20);

  const columns = useUnifiedHistoryColumns();

  const toggleSourceFilter = useCallback(
    (filter: SourceFilter) => {
      setSourceFilters((prev) => {
        const next = new Set(prev);
        if (next.has(filter)) {
          next.delete(filter);
        } else {
          next.add(filter);
        }
        return next;
      });
      resetCursors();
    },
    [resetCursors]
  );

  // Only pass sourceFilters when not all are selected (i.e. when there's an actual filter)
  const activeSourceFilters =
    sourceFilters.size === 3 ? undefined : Array.from(sourceFilters).join(',');

  const handleSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setActiveKuery(trimmed || undefined);
      resetCursors();
    },
    [resetCursors]
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

  const onNextPage = useCallback(() => {
    if (data) {
      handleNextPage({
        nextActionsCursor: data.nextActionsCursor,
        nextScheduledCursor: data.nextScheduledCursor,
        nextScheduledOffset: data.nextScheduledOffset,
      });
    }
  }, [data, handleNextPage]);

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
                onClick={onNextPage}
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
