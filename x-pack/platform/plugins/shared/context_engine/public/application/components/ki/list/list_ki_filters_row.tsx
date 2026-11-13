/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { KiListSummary } from '../../../hooks/use_list_ki';
import type { ListKiSortValue, ListKiStatusFilterValue, ListKiTypeFilter } from './list_ki_helpers';
import { ListKiSearchBox } from './list_ki_search_box';
import { ListKiSortSelect } from './list_ki_sort_select';
import { ListKiStatusFilter } from './list_ki_status_filter';
import { ListKiTypeFilter as ListKiTypeFilterButton } from './list_ki_type_filter';

const SEARCH_MAX_WIDTH = '340px';
const SEARCH_MIN_WIDTH = '200px';

interface ListKiFiltersRowProps {
  searchText: string;
  isSearchLoading?: boolean;
  onSearchTextChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  statusFilter: ListKiStatusFilterValue;
  onStatusFilterChange: (status: ListKiStatusFilterValue) => void;
  sort: ListKiSortValue;
  typeFilter: ListKiTypeFilter;
  summary: KiListSummary;
  onTypeFilterChange: (filter: ListKiTypeFilter) => void;
}

export const ListKiFiltersRow = ({
  searchText,
  isSearchLoading = false,
  onSearchTextChange,
  onSearchSubmit,
  statusFilter,
  onStatusFilterChange,
  sort,
  typeFilter,
  summary,
  onTypeFilterChange,
}: ListKiFiltersRowProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => ({
      row: css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: `${euiTheme.size.s} ${euiTheme.size.m}`,
      }),
      search: css({
        flex: `1 1 ${SEARCH_MIN_WIDTH}`,
        minWidth: SEARCH_MIN_WIDTH,
        maxWidth: SEARCH_MAX_WIDTH,
      }),
    }),
    [euiTheme]
  );

  return (
    <div css={styles.row} data-test-subj="contextListKiFilters">
      <div css={styles.search}>
        <ListKiSearchBox
          value={searchText}
          isLoading={isSearchLoading}
          onChange={onSearchTextChange}
          onCommit={onSearchSubmit}
        />
      </div>
      <div>
        <ListKiStatusFilter
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />
      </div>
      <div>
        <ListKiSortSelect sort={sort} />
      </div>
      <EuiFilterGroup>
        <ListKiTypeFilterButton
          typeFilter={typeFilter}
          summary={summary}
          onTypeFilterChange={onTypeFilterChange}
        />
      </EuiFilterGroup>
    </div>
  );
};
