/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiNotificationBadge, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';

import type { CaseUserActionsStats } from '../../../../../containers/types';
import * as activityBarI18n from '../../../../user_actions_activity_bar/translations';
import { TYPE } from '../../../../case_view/components/translations';
import type { UserActivityFilter } from '../../../../user_actions_activity_bar/types';

const TYPE_FILTER_ID = 'userActionsType';

type TypeOption = EuiSelectableOption<{ value: UserActivityFilter }>;

interface TypeFilterProps {
  isLoading?: boolean;
  type: UserActivityFilter;
  userActionsStats?: CaseUserActionsStats;
  onTypeChange: (type: UserActivityFilter) => void;
}

/**
 * Renders the All / Comments / History selector as a single dropdown filter
 * button (mirroring `SortFilter`) instead of three standalone toggle
 * buttons, so it takes up less horizontal space alongside the author and
 * sort filters.
 */
export const TypeFilter = React.memo<TypeFilterProps>(
  ({ type, onTypeChange, userActionsStats, isLoading = false }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const allCount =
      userActionsStats && userActionsStats.total > 0
        ? userActionsStats.total -
          userActionsStats.totalCommentDeletions -
          userActionsStats.totalHiddenCommentUpdates
        : 0;
    const commentsCount = Math.max(
      (userActionsStats?.totalCommentCreations ?? 0) -
        (userActionsStats?.totalCommentDeletions ?? 0),
      0
    );
    const historyCount =
      userActionsStats && userActionsStats.totalOtherActions > 0
        ? userActionsStats.totalOtherActions
        : 0;

    const options = useMemo<TypeOption[]>(
      () => [
        {
          label: activityBarI18n.ALL,
          value: 'all',
          checked: type === 'all' ? 'on' : undefined,
          append: <EuiNotificationBadge color="subdued">{allCount}</EuiNotificationBadge>,
          'data-test-subj': 'user-actions-filter-bar-type-option-all',
        },
        {
          label: activityBarI18n.COMMENTS,
          value: 'user',
          checked: type === 'user' ? 'on' : undefined,
          append: <EuiNotificationBadge color="subdued">{commentsCount}</EuiNotificationBadge>,
          'data-test-subj': 'user-actions-filter-bar-type-option-comments',
        },
        {
          label: activityBarI18n.HISTORY,
          value: 'action',
          checked: type === 'action' ? 'on' : undefined,
          append: <EuiNotificationBadge color="subdued">{historyCount}</EuiNotificationBadge>,
          'data-test-subj': 'user-actions-filter-bar-type-option-history',
        },
      ],
      [type, allCount, commentsCount, historyCount]
    );

    const onChange = useCallback(
      (newOptions: TypeOption[]) => {
        const selected = newOptions.find((option) => option.checked === 'on');
        if (selected && selected.value !== type) {
          onTypeChange(selected.value);
        }
        closePopover();
      },
      [type, onTypeChange, closePopover]
    );

    const selectedLabel = useMemo(() => {
      if (type === 'user') return activityBarI18n.COMMENTS;
      if (type === 'action') return activityBarI18n.HISTORY;
      return activityBarI18n.ALL;
    }, [type]);

    return (
      <EuiPopover
        ownFocus
        aria-label={TYPE}
        button={
          <EuiFilterButton
            data-test-subj="user-actions-filter-bar-type-button"
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            hasActiveFilters={type !== 'all'}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {`${TYPE}: ${selectedLabel}`}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        repositionOnScroll
        data-test-subj={`options-filter-popover-${TYPE_FILTER_ID}`}
      >
        <EuiSelectable<{ value: UserActivityFilter }>
          options={options}
          singleSelection="always"
          onChange={onChange}
          aria-label={TYPE}
        >
          {(list) => (
            <div
              css={css`
                width: 240px;
              `}
            >
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    );
  }
);

TypeFilter.displayName = 'TypeFilter';
