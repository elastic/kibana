/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useRef } from 'react';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import type { KiListSummary } from '../../../hooks/use_list_ki';
import type { ListKiTypeFilter } from './list_ki_helpers';
import { ListKiSearchBox, type ListKiSearchBoxHandle } from './list_ki_search_box';
import { ListKiStatusFilter } from './list_ki_status_filter';
import { ListKiTypeFilter as ListKiTypeFilterButton } from './list_ki_type_filter';

interface ListKiHeaderProps {
  searchQuery: string;
  isSearchLoading?: boolean;
  onSearch: (value: string) => void;
  typeFilter: ListKiTypeFilter;
  summary: KiListSummary;
  onTypeFilterChange: (filter: ListKiTypeFilter) => void;
  statusFilter: KiLifecycleStatus;
  onStatusFilterChange: (status: KiLifecycleStatus) => void;
  isRefreshing?: boolean;
  onRefresh: (committedSearchQuery: string) => void;
}

export const ListKiHeader = ({
  searchQuery,
  isSearchLoading = false,
  onSearch,
  typeFilter,
  summary,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  isRefreshing = false,
  onRefresh,
}: ListKiHeaderProps) => {
  const searchBoxRef = useRef<ListKiSearchBoxHandle>(null);

  const refreshLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.refreshButton', {
    defaultMessage: 'Refresh',
  });

  const handleRefresh = () => {
    const committed = searchBoxRef.current?.commitSearch() ?? searchQuery.trim();
    onRefresh(committed);
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <ListKiSearchBox
          ref={searchBoxRef}
          value={searchQuery}
          isLoading={isSearchLoading}
          onSearch={onSearch}
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
      <EuiFlexItem grow={false}>
        <EuiToolTip content={refreshLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="refresh"
            size="s"
            display="base"
            color="primary"
            isLoading={isRefreshing}
            onClick={handleRefresh}
            aria-label={refreshLabel}
            data-test-subj="contextListKiRefreshButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
