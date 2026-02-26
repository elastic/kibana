/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFieldSearch, EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RunByFilterPopover } from './run_by_filter_popover';

const SEARCH_PLACEHOLDER = i18n.translate('xpack.osquery.historyFilters.searchPlaceholder', {
  defaultMessage: 'Search by query ID or agent ID',
});

interface HistoryFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedUserIds: string[];
  onSelectedUsersChanged: (userIds: string[]) => void;
}

const HistoryFiltersComponent: React.FC<HistoryFiltersProps> = ({
  searchValue,
  onSearchChange,
  selectedUserIds,
  onSelectedUsersChanged,
}) => {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow={3}>
        <EuiFieldSearch
          fullWidth
          placeholder={SEARCH_PLACEHOLDER}
          value={searchValue}
          onChange={handleSearchChange}
          isClearable
          data-test-subj="history-search-input"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <RunByFilterPopover
            selectedUserIds={selectedUserIds}
            onSelectedUsersChanged={onSelectedUsersChanged}
            enabled
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HistoryFiltersComponent.displayName = 'HistoryFilters';

export const HistoryFilters = React.memo(HistoryFiltersComponent);
