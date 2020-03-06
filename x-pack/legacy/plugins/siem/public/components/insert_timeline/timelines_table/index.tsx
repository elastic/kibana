/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable as _EuiBasicTable } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import * as i18n from '../translations';
import { OnInsertTimeline, OnTableChange, InsertTimelineResult } from '../types';
import { getColumns } from './columns';

// there are a number of type mismatches across this file
const EuiBasicTable: any = _EuiBasicTable; // eslint-disable-line @typescript-eslint/no-explicit-any

const BasicTable = styled(EuiBasicTable)`
  max-width: 500px;
  .euiTableCellContent {
    animation: none; /* Prevents applying max-height from animation */
  }
`;
BasicTable.displayName = 'BasicTable';

export interface TimelinesTableProps {
  defaultPageSize: number;
  loading: boolean;
  onInsertTimeline: OnInsertTimeline;
  onTableChange: OnTableChange;
  pageIndex: number;
  pageSize: number;
  searchResults: InsertTimelineResult[];
  sortDirection: 'asc' | 'desc';
  sortField: string;
  totalSearchResultsCount: number;
}

/**
 * Renders a table that displays metadata about timelines, (i.e. name,
 * description, etc.)
 */
export const TimelinesTable = React.memo<TimelinesTableProps>(
  ({
    defaultPageSize,
    loading: isLoading,
    onInsertTimeline,
    onTableChange,
    pageIndex,
    pageSize,
    searchResults,
    sortDirection,
    sortField,
    totalSearchResultsCount,
  }) => {
    const pagination = {
      hidePerPageOptions: true,
      pageIndex,
      pageSize,
      pageSizeOptions: [
        Math.floor(Math.max(defaultPageSize, 1) / 2),
        defaultPageSize,
        defaultPageSize * 2,
      ],
      totalItemCount: totalSearchResultsCount,
    };

    const sorting = {
      sort: {
        field: sortField as keyof InsertTimelineResult,
        direction: sortDirection,
      },
    };

    return (
      <BasicTable
        columns={getColumns({
          onInsertTimeline,
        })}
        compressed
        data-test-subj="insert-timelines-table"
        itemId="savedObjectId"
        items={searchResults}
        loading={isLoading}
        noItemsMessage={i18n.ZERO_TIMELINES_MATCH}
        onChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
      />
    );
  }
);
TimelinesTable.displayName = 'TimelinesTable';
