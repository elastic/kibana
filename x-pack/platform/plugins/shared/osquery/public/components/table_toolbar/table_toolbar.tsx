/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFieldSearch, EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CreatedByFilterPopover } from './created_by_filter_popover';
import { EnabledFilterButtons } from './enabled_filter_buttons';
import { ColumnPickerPopover } from './column_picker_popover';
import { SortFieldsPopover } from './sort_fields_popover';
import type { EnabledFilter } from './enabled_filter_buttons';
import type { ColumnConfig } from './column_picker_popover';
import type { SortFieldConfig, SortDirection } from './sort_fields_popover';

const searchFieldCss = css`
  min-width: 300px;
`;

interface TableToolbarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchSubmit: (value: string) => void;

  users?: string[];
  selectedUsers?: string[];
  onSelectedUsersChange?: (users: string[]) => void;
  profilesMap?: Map<string, UserProfileWithAvatar>;

  enabledFilter?: EnabledFilter;
  onEnabledFilterChange?: (value: EnabledFilter) => void;
  showEnabledFilter?: boolean;

  additionalFilters?: React.ReactNode;

  columnConfigs: ColumnConfig[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columnIds: string[]) => void;

  sortFields: SortFieldConfig[];
  sortField: string;
  sortDirection: SortDirection;
  onSortChange: (field: string, direction: SortDirection) => void;

  actionButton?: React.ReactNode;

  'data-test-subj'?: string;
}

const TableToolbarComponent: React.FC<TableToolbarProps> = ({
  searchPlaceholder,
  searchValue,
  onSearchSubmit,
  users,
  selectedUsers,
  onSelectedUsersChange,
  profilesMap,
  enabledFilter,
  onEnabledFilterChange,
  showEnabledFilter = false,
  additionalFilters,
  columnConfigs,
  visibleColumns,
  onVisibleColumnsChange,
  sortFields,
  sortField,
  sortDirection,
  onSortChange,
  actionButton,
  'data-test-subj': dataTestSubj = 'table-toolbar',
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearch(e.target.value);
      if (e.target.value === '') {
        onSearchSubmit('');
      }
    },
    [onSearchSubmit]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearchSubmit(localSearch);
      }
    },
    [localSearch, onSearchSubmit]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap alignItems="center">
        <EuiFlexItem grow={3} css={searchFieldCss}>
          <EuiFieldSearch
            fullWidth
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            isClearable
            data-test-subj={`${dataTestSubj}-search`}
          />
        </EuiFlexItem>
        {additionalFilters ? (
          <EuiFlexItem grow={false}>{additionalFilters}</EuiFlexItem>
        ) : (
          <>
            {users && selectedUsers && onSelectedUsersChange && profilesMap && (
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  <CreatedByFilterPopover
                    users={users}
                    selectedUsers={selectedUsers}
                    onSelectionChange={onSelectedUsersChange}
                    profilesMap={profilesMap}
                    data-test-subj={`${dataTestSubj}-created-by`}
                  />
                </EuiFilterGroup>
              </EuiFlexItem>
            )}
            {showEnabledFilter && onEnabledFilterChange && (
              <EuiFlexItem grow={false}>
                <EnabledFilterButtons
                  value={enabledFilter}
                  onChange={onEnabledFilterChange}
                  data-test-subj={`${dataTestSubj}-enabled`}
                />
              </EuiFlexItem>
            )}
          </>
        )}
        {actionButton && <EuiFlexItem grow={false}>{actionButton}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <ColumnPickerPopover
            columns={columnConfigs}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={onVisibleColumnsChange}
            data-test-subj={`${dataTestSubj}-columns`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SortFieldsPopover
            fields={sortFields}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
            data-test-subj={`${dataTestSubj}-sort`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

TableToolbarComponent.displayName = 'TableToolbar';

export const TableToolbar = React.memo(TableToolbarComponent);
