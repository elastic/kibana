/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';

import * as activityBarI18n from '../../../../user_actions_activity_bar/translations';
import type { UserActivitySortOrder } from '../../../../user_actions_activity_bar/types';

const SORT_FILTER_ID = 'userActionsSort';

type SortOption = EuiSelectableOption<{ value: UserActivitySortOrder }>;

interface SortFilterProps {
  sortOrder: UserActivitySortOrder;
  isLoading?: boolean;
  onSortOrderChange: (sortOrder: UserActivitySortOrder) => void;
}

/**
 * Renders sort order (Newest first / Oldest first) as a dropdown filter
 * button, so it can live inside the same `EuiFilterGroup` as the type and
 * author filters instead of the standalone `EuiSelect` used by the
 * (classic) `UserActionsActivityBar`.
 */
export const SortFilter = React.memo<SortFilterProps>(
  ({ sortOrder, onSortOrderChange, isLoading = false }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const options = useMemo<SortOption[]>(
      () => [
        {
          label: activityBarI18n.NEWEST,
          value: 'desc',
          checked: sortOrder === 'desc' ? 'on' : undefined,
          'data-test-subj': 'user-actions-filter-bar-sort-option-desc',
        },
        {
          label: activityBarI18n.OLDEST,
          value: 'asc',
          checked: sortOrder === 'asc' ? 'on' : undefined,
          'data-test-subj': 'user-actions-filter-bar-sort-option-asc',
        },
      ],
      [sortOrder]
    );

    const onChange = useCallback(
      (newOptions: SortOption[]) => {
        const selected = newOptions.find((option) => option.checked === 'on');
        if (selected && selected.value !== sortOrder) {
          onSortOrderChange(selected.value);
        }
        closePopover();
      },
      [sortOrder, onSortOrderChange, closePopover]
    );

    const selectedLabel = sortOrder === 'asc' ? activityBarI18n.OLDEST : activityBarI18n.NEWEST;

    return (
      <EuiPopover
        ownFocus
        aria-label={activityBarI18n.SORT_BY}
        button={
          <EuiFilterButton
            data-test-subj="user-actions-filter-bar-sort-button"
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isPopoverOpen}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {`${activityBarI18n.SORT_BY}: ${selectedLabel}`}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        repositionOnScroll
        data-test-subj={`options-filter-popover-${SORT_FILTER_ID}`}
      >
        <EuiSelectable<{ value: UserActivitySortOrder }>
          options={options}
          singleSelection="always"
          onChange={onChange}
          aria-label={activityBarI18n.SORTED_BY_ARIA_LABEL}
        >
          {(list) => (
            <div
              css={css`
                width: 200px;
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

SortFilter.displayName = 'SortFilter';
