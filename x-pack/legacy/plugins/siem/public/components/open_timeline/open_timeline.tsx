/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';

import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineProps } from './types';
import { SearchRow } from './search_row';
import { TimelinesTable } from './timelines_table';
import { TitleRow } from './title_row';

export const OpenTimeline = React.memo<OpenTimelineProps>(
  ({
    deleteTimelines,
    defaultPageSize,
    isLoading,
    itemIdToExpandedNotesRowMap,
    onAddTimelinesToFavorites,
    onDeleteSelected,
    onlyFavorites,
    onOpenTimeline,
    onQueryChange,
    onSelectionChange,
    onTableChange,
    onToggleOnlyFavorites,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    query,
    searchResults,
    selectedItems,
    sortDirection,
    sortField,
    title,
    totalSearchResultsCount,
  }) => (
    <EuiPanel className={OPEN_TIMELINE_CLASS_NAME}>
      <TitleRow
        data-test-subj="title-row"
        selectedTimelinesCount={selectedItems.length}
        title={title}
        onAddTimelinesToFavorites={onAddTimelinesToFavorites}
        onDeleteSelected={onDeleteSelected}
      />

      <SearchRow
        data-test-subj="search-row"
        onlyFavorites={onlyFavorites}
        query={query}
        totalSearchResultsCount={totalSearchResultsCount}
        onQueryChange={onQueryChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
      />

      <TimelinesTable
        data-test-subj="timelines-table"
        defaultPageSize={defaultPageSize}
        deleteTimelines={deleteTimelines}
        itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
        loading={isLoading}
        pageIndex={pageIndex}
        pageSize={pageSize}
        searchResults={searchResults}
        showExtendedColumnsAndActions={onDeleteSelected != null && deleteTimelines != null}
        sortDirection={sortDirection}
        sortField={sortField}
        totalSearchResultsCount={totalSearchResultsCount}
        onOpenTimeline={onOpenTimeline}
        onSelectionChange={onSelectionChange}
        onTableChange={onTableChange}
        onToggleShowNotes={onToggleShowNotes}
      />
    </EuiPanel>
  )
);

OpenTimeline.displayName = 'OpenTimeline';
