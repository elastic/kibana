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
import { css } from '@emotion/react';

import type { CaseUserActionsStats } from '../../../../../containers/types';
import type {
  UserActivityFilter,
  UserActivityParams,
  UserActivitySortOrder,
} from '../../../../user_actions_activity_bar/types';
import { hasActiveUserActivityFilter } from '../../../../user_actions_activity_bar/utils';
import { TypeFilter } from './type_filter';
import { AuthorFilter } from './author_filter';
import { SortFilter } from './sort_filter';
import * as i18n from './translations';

interface UserActionsFilterBarProps {
  caseId: string;
  params: UserActivityParams;
  userActionsStats?: CaseUserActionsStats;
  isLoading?: boolean;
  onParamsChange: (params: UserActivityParams) => void;
}

/**
 * Search + filter toolbar for the redesigned case activity tab. Mirrors the
 * layout of the attachments filter bar (`CaseViewAttachments`): a search
 * input followed by an `EuiFilterGroup` with type / author / sort filters,
 * and an optional "Clear filters" affordance below the toolbar. Unlike the
 * attachments filter, search and filtering here are performed server-side by
 * the user_actions `_find` endpoint.
 */
export const UserActionsFilterBar = React.memo<UserActionsFilterBarProps>(
  ({ caseId, params, userActionsStats, isLoading = false, onParamsChange }) => {
    const [searchInputValue, setSearchInputValue] = useState(params.search ?? '');

    // Derived from the applied `params`, not `searchInputValue`, so "Clear
    // filters" can't fall out of sync with what's actually being filtered on
    // (e.g. while backspacing an applied search term without blurring yet).
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

    // Clearing the input via backspace and then leaving the field (without
    // pressing Enter or clicking the field's own clear button) should still
    // apply the now-empty search, otherwise the last applied search term
    // stays active even though the input looks empty.
    const handleSearchBlur = useCallback(() => {
      if (!searchInputValue.trim() && params.search) {
        onParamsChange({ ...params, search: undefined });
      }
    }, [searchInputValue, params, onParamsChange]);

    const handleClearFilters = useCallback(() => {
      setSearchInputValue('');
      onParamsChange({ ...params, type: 'all', authors: undefined, search: undefined });
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
              <SortFilter
                sortOrder={params.sortOrder}
                onSortOrderChange={handleSortOrderChange}
                isLoading={isLoading}
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {/*
          Always render this row (instead of conditionally mounting it) and
          toggle visibility instead, so the toolbar reserves the same space
          whether or not "Clear filters" is showing and doesn't bounce.
        */}
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleClearFilters}
              size="xs"
              iconSide="left"
              iconType="cross"
              flush="left"
              isDisabled={!hasActiveFilter}
              tabIndex={hasActiveFilter ? 0 : -1}
              aria-hidden={!hasActiveFilter}
              css={css`
                visibility: ${hasActiveFilter ? 'visible' : 'hidden'};
              `}
              data-test-subj="user-actions-filter-bar-clear-filters"
            >
              {i18n.CLEAR_FILTERS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

UserActionsFilterBar.displayName = 'UserActionsFilterBar';
