/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import type { CaseUserActionsStats } from '../../../../containers/types';
import type { UserActionFindRequestSources } from '../../../../../common/types/api';
import type {
  UserActivityFilter,
  UserActivityParams,
  UserActivitySortOrder,
} from '../../../user_actions_activity_bar/types';
import { hasActiveUserActivityFilter } from '../../../user_actions_activity_bar/utils';
import { TypeFilter } from './type_filter';
import { AuthorFilter } from './author_filter';
import { SourceFilter } from './source_filter';
import { SortFilter } from './sort_filter';
import * as i18n from './translations';

interface UserActionsFilterBarProps {
  caseId: string;
  params: UserActivityParams;
  userActionsStats?: CaseUserActionsStats;
  isLoading?: boolean;
  onParamsChange: (params: UserActivityParams) => void;
  /** Rendered at the end of the "Clear filters" row, so both share one line. */
  rightAction?: React.ReactNode;
}

/**
 * Activity search and filters. Filtering runs on the user_actions `_find` API.
 */
export const UserActionsFilterBar = React.memo<UserActionsFilterBarProps>(
  ({ caseId, params, userActionsStats, isLoading = false, onParamsChange, rightAction }) => {
    const [searchInputValue, setSearchInputValue] = useState(params.search ?? '');

    // Applied params, not the in-progress search input.
    const hasActiveFilter = hasActiveUserActivityFilter(params);

    const handleTypeChange = useCallback(
      (type: UserActivityFilter) => {
        onParamsChange({ ...params, type });
      },
      [params, onParamsChange]
    );

    const handleAuthorsChange = useCallback(
      (authors: string[]) => {
        onParamsChange({ ...params, authors: authors.length ? authors : undefined });
      },
      [params, onParamsChange]
    );

    const handleSourcesChange = useCallback(
      (sources: UserActionFindRequestSources[]) => {
        onParamsChange({ ...params, sources: sources.length ? sources : undefined });
      },
      [params, onParamsChange]
    );

    const handleSortOrderChange = useCallback(
      (sortOrder: UserActivitySortOrder) => {
        onParamsChange({ ...params, sortOrder });
      },
      [params, onParamsChange]
    );

    const handleSearch = useCallback(
      (searchValue: string) => {
        onParamsChange({ ...params, search: searchValue.trim() || undefined });
      },
      [params, onParamsChange]
    );

    const handleSearchBlur = useCallback(() => {
      if (!searchInputValue.trim() && params.search) {
        onParamsChange({ ...params, search: undefined });
      }
    }, [searchInputValue, params, onParamsChange]);

    const handleClearFilters = useCallback(() => {
      setSearchInputValue('');
      onParamsChange({
        ...params,
        type: 'all',
        authors: undefined,
        sources: undefined,
        search: undefined,
      });
    }, [params, onParamsChange]);

    return (
      <>
        <EuiFlexGroup gutterSize="s" responsive={false} data-test-subj="user-actions-filter-bar">
          <EuiFlexItem grow={true}>
            <EuiFieldSearch
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onSearch={handleSearch}
              onBlur={handleSearchBlur}
              fullWidth
              data-test-subj="user-actions-filter-bar-search"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup data-test-subj="user-actions-filter-bar-filter-group">
              <TypeFilter
                type={params.type}
                onTypeChange={handleTypeChange}
                userActionsStats={userActionsStats}
                isLoading={isLoading}
              />
              <AuthorFilter
                caseId={caseId}
                authors={params.authors}
                onAuthorsChange={handleAuthorsChange}
                isLoading={isLoading}
              />
              <SourceFilter
                sources={params.sources}
                onSourcesChange={handleSourcesChange}
                isLoading={isLoading}
              />
              <SortFilter
                sortOrder={params.sortOrder}
                onSortOrderChange={handleSortOrderChange}
                isLoading={isLoading}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {/* One row for both, always rendered: "Clear filters" only appears once a filter is active,
            and when it lived on its own line it pushed the collapse controls down the moment you
            filtered. Sharing the row keeps everything still. */}
        <EuiSpacer size="xs" />
        <EuiFlexGroup
          gutterSize="none"
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            {hasActiveFilter ? (
              <EuiButtonEmpty
                onClick={handleClearFilters}
                size="xs"
                iconSide="left"
                iconType="cross"
                flush="left"
                data-test-subj="user-actions-filter-bar-clear-filters"
              >
                {i18n.CLEAR_FILTERS}
              </EuiButtonEmpty>
            ) : null}
          </EuiFlexItem>
          {rightAction ? <EuiFlexItem grow={false}>{rightAction}</EuiFlexItem> : null}
        </EuiFlexGroup>
      </>
    );
  }
);

UserActionsFilterBar.displayName = 'UserActionsFilterBar';
