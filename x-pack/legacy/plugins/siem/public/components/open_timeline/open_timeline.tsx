/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineProps } from './types';
import { SearchRow } from './search_row';
import { TimelinesTable } from './timelines_table';
import { TitleRow } from './title_row';

export const OpenTimelinePanel = styled(EuiPanel)`
  width: 100%;
`;

export const OpenTimeline = pure<OpenTimelineProps>(
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
    <OpenTimelinePanel className={OPEN_TIMELINE_CLASS_NAME} paddingSize="l">
      <TitleRow
        data-test-subj="title-row"
        onDeleteSelected={onDeleteSelected}
        onAddTimelinesToFavorites={onAddTimelinesToFavorites}
        selectedTimelinesCount={selectedItems.length}
        title={title}
      />

      <EuiSpacer data-test-subj="title-row-spacer" size="l" />

      <SearchRow
        data-test-subj="search-row"
        onlyFavorites={onlyFavorites}
        onQueryChange={onQueryChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        query={query}
        totalSearchResultsCount={totalSearchResultsCount}
      />

      <EuiSpacer data-test-subj="search-row-spacer" size="l" />

      <TimelinesTable
        data-test-subj="timelines-table"
        deleteTimelines={deleteTimelines}
        defaultPageSize={defaultPageSize}
        loading={isLoading}
        itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
        onOpenTimeline={onOpenTimeline}
        onSelectionChange={onSelectionChange}
        onTableChange={onTableChange}
        onToggleShowNotes={onToggleShowNotes}
        pageIndex={pageIndex}
        pageSize={pageSize}
        searchResults={searchResults}
        showExtendedColumnsAndActions={onDeleteSelected != null && deleteTimelines != null}
        sortDirection={sortDirection}
        sortField={sortField}
        totalSearchResultsCount={totalSearchResultsCount}
      />
    </OpenTimelinePanel>
  )
);
