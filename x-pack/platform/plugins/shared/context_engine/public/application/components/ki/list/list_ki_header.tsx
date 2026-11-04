/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import type { KiListSummary } from '../../../hooks/use_list_ki';
import type { ListKiTypeFilter } from './list_ki_helpers';
import { ListKiSearchBox } from './list_ki_search_box';
import { ListKiStatusFilter } from './list_ki_status_filter';
import { ListKiTypeFilter as ListKiTypeFilterButton } from './list_ki_type_filter';

interface ListKiHeaderProps {
  searchText: string;
  submittedQuery: string;
  isSearchLoading?: boolean;
  onSearchTextChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  typeFilter: ListKiTypeFilter;
  summary: KiListSummary;
  onTypeFilterChange: (filter: ListKiTypeFilter) => void;
  statusFilter: KiLifecycleStatus;
  onStatusFilterChange: (status: KiLifecycleStatus) => void;
  onSearchSubmitClick: () => void;
}

export const ListKiHeader = ({
  searchText,
  submittedQuery,
  isSearchLoading = false,
  onSearchTextChange,
  onSearchSubmit,
  typeFilter,
  summary,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onSearchSubmitClick,
}: ListKiHeaderProps) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <ListKiSearchBox
          value={searchText}
          submittedQuery={submittedQuery}
          isLoading={isSearchLoading}
          onChange={onSearchTextChange}
          onCommit={onSearchSubmit}
          onSubmitClick={onSearchSubmitClick}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <ListKiStatusFilter
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
          />

          <ListKiTypeFilterButton
            typeFilter={typeFilter}
            summary={summary}
            onTypeFilterChange={onTypeFilterChange}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
