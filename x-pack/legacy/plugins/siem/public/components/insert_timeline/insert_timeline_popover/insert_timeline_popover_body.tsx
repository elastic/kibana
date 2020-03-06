/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import styled from 'styled-components';

import { InsertTimelineProps } from '../types';
import { SearchRow } from '../search_row';
import { TimelinesTable } from '../timelines_table';
export const HeaderContainer = styled.div`
  width: 100%;
`;

HeaderContainer.displayName = 'HeaderContainer';

export const InsertTimelinePopoverBody = memo<InsertTimelineProps>(
  ({
    defaultPageSize,
    isLoading,
    onlyFavorites,
    onInsertTimeline,
    onQueryChange,
    onTableChange,
    onToggleOnlyFavorites,
    pageIndex,
    pageSize,
    query,
    searchResults,
    sortDirection,
    sortField,
    totalSearchResultsCount,
  }) => {
    return (
      <>
        <HeaderContainer>
          <SearchRow
            data-test-subj="search-row"
            onlyFavorites={onlyFavorites}
            onQueryChange={onQueryChange}
            onToggleOnlyFavorites={onToggleOnlyFavorites}
            query={query}
            totalSearchResultsCount={totalSearchResultsCount}
          />
        </HeaderContainer>
        <TimelinesTable
          data-test-subj="timelines-table"
          defaultPageSize={defaultPageSize}
          loading={isLoading}
          onInsertTimeline={onInsertTimeline}
          onTableChange={onTableChange}
          pageIndex={pageIndex}
          pageSize={pageSize}
          searchResults={searchResults}
          sortDirection={sortDirection}
          sortField={sortField}
          totalSearchResultsCount={totalSearchResultsCount}
        />
      </>
    );
  }
);

InsertTimelinePopoverBody.displayName = 'InsertTimelinePopoverBody';
