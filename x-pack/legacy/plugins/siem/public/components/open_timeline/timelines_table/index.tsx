/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable as _EuiBasicTable } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import * as i18n from '../translations';
import {
  DeleteTimelines,
  OnOpenTimeline,
  OnSelectionChange,
  OnTableChange,
  OnToggleShowNotes,
  OpenTimelineResult,
} from '../types';
import { getActionsColumns } from './actions_columns';
import { getCommonColumns } from './common_columns';
import { getExtendedColumns } from './extended_columns';
import { getIconHeaderColumns } from './icon_header_columns';

// there are a number of type mismatches across this file
const EuiBasicTable: any = _EuiBasicTable; // eslint-disable-line @typescript-eslint/no-explicit-any

const BasicTable = styled(EuiBasicTable)`
  .euiTableCellContent {
    animation: none; /* Prevents applying max-height from animation */
  }

  .euiTableRow-isExpandedRow .euiTableCellContent__text {
    width: 100%; /* Fixes collapsing nested flex content in IE11 */
  }
`;
BasicTable.displayName = 'BasicTable';

const getExtendedColumnsIfEnabled = (showExtendedColumnsAndActions: boolean) =>
  showExtendedColumnsAndActions ? [...getExtendedColumns()] : [];

/**
 * Returns the column definitions (passed as the `columns` prop to
 * `EuiBasicTable`) that are displayed in the compact `Open Timeline` modal
 * view, and the full view shown in the `All Timelines` view of the
 * `Timelines` page
 */
const getTimelinesTableColumns = ({
  deleteTimelines,
  itemIdToExpandedNotesRowMap,
  onOpenTimeline,
  onToggleShowNotes,
  showExtendedColumnsAndActions,
}: {
  deleteTimelines?: DeleteTimelines;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  onOpenTimeline: OnOpenTimeline;
  onToggleShowNotes: OnToggleShowNotes;
  showExtendedColumnsAndActions: boolean;
}) => [
  ...getCommonColumns({
    itemIdToExpandedNotesRowMap,
    onOpenTimeline,
    onToggleShowNotes,
    showExtendedColumnsAndActions,
  }),
  ...getExtendedColumnsIfEnabled(showExtendedColumnsAndActions),
  ...getIconHeaderColumns(),
  ...getActionsColumns({
    deleteTimelines,
    onOpenTimeline,
    showDeleteAction: showExtendedColumnsAndActions,
  }),
];

export interface TimelinesTableProps {
  deleteTimelines?: DeleteTimelines;
  defaultPageSize: number;
  loading: boolean;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  onOpenTimeline: OnOpenTimeline;
  onSelectionChange: OnSelectionChange;
  onTableChange: OnTableChange;
  onToggleShowNotes: OnToggleShowNotes;
  pageIndex: number;
  pageSize: number;
  searchResults: OpenTimelineResult[];
  showExtendedColumnsAndActions: boolean;
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
    deleteTimelines,
    defaultPageSize,
    loading: isLoading,
    itemIdToExpandedNotesRowMap,
    onOpenTimeline,
    onSelectionChange,
    onTableChange,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    searchResults,
    showExtendedColumnsAndActions,
    sortField,
    sortDirection,
    totalSearchResultsCount,
  }) => {
    const pagination = {
      hidePerPageOptions: !showExtendedColumnsAndActions,
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
        field: sortField as keyof OpenTimelineResult,
        direction: sortDirection,
      },
    };

    const selection = {
      selectable: (timelineResult: OpenTimelineResult) => timelineResult.savedObjectId != null,
      selectableMessage: (selectable: boolean) =>
        !selectable ? i18n.MISSING_SAVED_OBJECT_ID : undefined,
      onSelectionChange,
    };

    return (
      <BasicTable
        columns={getTimelinesTableColumns({
          deleteTimelines,
          itemIdToExpandedNotesRowMap,
          onOpenTimeline,
          onToggleShowNotes,
          showExtendedColumnsAndActions,
        })}
        data-test-subj="timelines-table"
        isExpandable={true}
        isSelectable={showExtendedColumnsAndActions}
        itemId="savedObjectId"
        itemIdToExpandedRowMap={itemIdToExpandedNotesRowMap}
        items={searchResults}
        loading={isLoading}
        noItemsMessage={i18n.ZERO_TIMELINES_MATCH}
        pagination={pagination}
        selection={showExtendedColumnsAndActions ? selection : undefined}
        sorting={sorting}
        compressed
        onChange={onTableChange}
      />
    );
  }
);
TimelinesTable.displayName = 'TimelinesTable';
