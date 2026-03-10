/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup, EuiFilterButton } from '@elastic/eui';

import type { CaseUserActionsStats } from '../../containers/types';
import * as i18n from './translations';
import type { UserActivityFilter } from './types';

interface FilterActivityProps {
  isLoading?: boolean;
  type: UserActivityFilter;
  userActionsStats?: CaseUserActionsStats;
  onFilterChange: (type: UserActivityFilter) => void;
}

export const FilterActivity = React.memo<FilterActivityProps>(
  ({ type, onFilterChange, userActionsStats, isLoading = false }) => {
    const handleFilterChange = useCallback(
      (value: UserActivityFilter) => {
        if (value !== type) {
          onFilterChange(value);
        }
      },
      [onFilterChange, type]
    );

    return (
      <EuiFilterGroup data-test-subj="user-actions-filter-activity-group">
        <EuiFilterButton
          withNext
          grow={false}
          onClick={() => handleFilterChange('all')}
          isToggle
          isSelected={type === 'all'}
          hasActiveFilters={type === 'all'}
          numFilters={
            userActionsStats && userActionsStats.total > 0
              ? userActionsStats.total -
                userActionsStats.totalCommentDeletions -
                userActionsStats.totalHiddenCommentUpdates
              : 0
          }
          isLoading={isLoading}
          isDisabled={isLoading}
          data-test-subj="user-actions-filter-activity-button-all"
          iconSize="s"
        >
          {i18n.ALL}
        </EuiFilterButton>
        <EuiFilterButton
          withNext
          grow={false}
          isToggle
          isSelected={type === 'user'}
          hasActiveFilters={type === 'user'}
          numFilters={
            (userActionsStats?.totalCommentCreations ?? 0) -
            (userActionsStats?.totalCommentDeletions ?? 0)
          }
          isLoading={isLoading}
          isDisabled={isLoading}
          onClick={() => handleFilterChange('user')}
          data-test-subj="user-actions-filter-activity-button-comments"
        >
          {i18n.COMMENTS}
        </EuiFilterButton>
        <EuiFilterButton
          isToggle
          isSelected={type === 'action'}
          hasActiveFilters={type === 'action'}
          numFilters={
            userActionsStats && userActionsStats.totalOtherActions > 0
              ? userActionsStats.totalOtherActions
              : 0
          }
          onClick={() => handleFilterChange('action')}
          isLoading={isLoading}
          isDisabled={isLoading}
          data-test-subj="user-actions-filter-activity-button-history"
        >
          {i18n.HISTORY}
        </EuiFilterButton>
      </EuiFilterGroup>
    );
  }
);

FilterActivity.displayName = 'FilterActivity';
