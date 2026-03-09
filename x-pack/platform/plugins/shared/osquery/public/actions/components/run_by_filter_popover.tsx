/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserAvatar } from '@kbn/user-profile-components';
import { useHistoryUsers } from '../use_history_users';
import type { HistoryUserOption } from '../use_history_users';

const POPOVER_WIDTH = 300;
const SEARCH_DEBOUNCE_MS = 300;

const RUN_BY_LABEL = i18n.translate('xpack.osquery.historyFilters.runByLabel', {
  defaultMessage: 'Run by',
});

const SEARCH_USERS_PLACEHOLDER = i18n.translate(
  'xpack.osquery.historyFilters.searchUsersPlaceholder',
  { defaultMessage: 'Search users' }
);

const PANEL_PROPS = { 'data-test-subj': 'history-run-by-filter-popover' };
const POPOVER_CONTENT_STYLE = { width: POPOVER_WIDTH };

interface RunByFilterPopoverProps {
  selectedUserIds: string[];
  onSelectedUsersChanged: (newUserIds: string[]) => void;
  enabled: boolean;
}

const toSelectableOption = (
  option: HistoryUserOption,
  isSelected: boolean
): EuiSelectableOption => {
  const user = option.profile?.user ?? { username: option.userId };

  return {
    label: option.displayName,
    key: option.userId,
    checked: isSelected ? 'on' : undefined,
    prepend: <UserAvatar user={user} avatar={option.profile?.data?.avatar} size="s" />,
  };
};

const RunByFilterPopoverComponent: React.FC<RunByFilterPopoverProps> = ({
  selectedUserIds,
  onSelectedUsersChanged,
  enabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const { userOptions, isLoading } = useHistoryUsers({
    enabled,
    searchTerm: debouncedSearch,
  });

  const selectableOptions = useMemo(() => {
    const selectedSet = new Set(selectedUserIds);
    const optionsFromServer = userOptions.map((opt) =>
      toSelectableOption(opt, selectedSet.has(opt.userId))
    );

    // Keep selected users visible even if they're not in the current search results
    const serverUserIds = new Set(userOptions.map((o) => o.userId));
    const missingSelected = selectedUserIds
      .filter((id) => !serverUserIds.has(id))
      .map((id) => toSelectableOption({ userId: id, displayName: id }, true));

    return [...missingSelected, ...optionsFromServer];
  }, [userOptions, selectedUserIds]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[], _: unknown, changedOption: EuiSelectableOption) => {
      const userId = changedOption.key!;
      const idx = selectedUserIds.indexOf(userId);
      const updated = [...selectedUserIds];
      if (idx >= 0) {
        updated.splice(idx, 1);
      } else {
        updated.push(userId);
      }

      onSelectedUsersChanged(updated);
    },
    [selectedUserIds, onSelectedUsersChanged]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const searchProps = useMemo(
    () => ({
      placeholder: SEARCH_USERS_PLACEHOLDER,
      onChange: handleSearchChange,
      value: searchValue,
    }),
    [handleSearchChange, searchValue]
  );

  const triggerButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      isLoading={isLoading}
      isSelected={isOpen}
      hasActiveFilters={selectedUserIds.length > 0}
      numActiveFilters={selectedUserIds.length}
      data-test-subj="history-run-by-filter-button"
    >
      {RUN_BY_LABEL}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={PANEL_PROPS}
    >
      <EuiSelectable
        searchable
        searchProps={searchProps}
        aria-label={RUN_BY_LABEL}
        options={selectableOptions}
        onChange={handleChange}
        isLoading={isLoading}
        emptyMessage={i18n.translate('xpack.osquery.historyFilters.noUsersAvailable', {
          defaultMessage: 'No users available',
        })}
        noMatchesMessage={i18n.translate('xpack.osquery.historyFilters.noUsersMatch', {
          defaultMessage: 'No users match search',
        })}
      >
        {(list, search) => (
          <div css={POPOVER_CONTENT_STYLE}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>{search}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

RunByFilterPopoverComponent.displayName = 'RunByFilterPopover';

export const RunByFilterPopover = React.memo(RunByFilterPopoverComponent);
