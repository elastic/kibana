/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useNavigation } from '../../../hooks/use_navigation';
import { LibraryToggleRow } from './library_toggle_row';
import { LibrarySortFilterButton } from './library_sort_filter_button';
import { useLibrarySortFilter } from './use_library_sort_filter';
import { FLYOUT_WIDTH } from './constants';

export interface LibraryItem {
  id: string;
  description: string;
}

export interface LibraryPanelLabels {
  title: string;
  manageLibraryLink: string;
  searchPlaceholder: string;
  availableSummary: (filtered: number, total: number) => React.ReactNode;
  noMatchMessage: string;
  noItemsMessage: string;
  disabledBadgeLabel?: string;
  disabledTooltipTitle?: string;
  disabledTooltipBody?: string;
}

export interface LibraryPanelProps<T extends LibraryItem> {
  onClose: () => void;
  allItems: T[];
  activeItemIdSet: Set<string>;
  onToggleItem: (item: T, isActive: boolean) => void;
  mutatingItemId: string | null;
  flyoutTitleId: string;
  libraryLabels: LibraryPanelLabels;
  manageLibraryPath: string;
  getItemName?: (item: T) => string;
  getSearchableText?: (item: T) => string[];
  disabledItemIdSet?: Set<string>;
  readOnlyItemIdSet?: Set<string>;
  callout?: React.ReactNode;
}

const defaultGetItemName = <T extends LibraryItem>(item: T): string => item.id;

export const LibraryPanel = <T extends LibraryItem>({
  onClose,
  allItems,
  activeItemIdSet,
  onToggleItem,
  mutatingItemId,
  flyoutTitleId,
  libraryLabels,
  manageLibraryPath,
  getItemName = defaultGetItemName,
  getSearchableText,
  disabledItemIdSet,
  readOnlyItemIdSet,
  callout,
}: LibraryPanelProps<T>) => {
  const { createAgentBuilderUrl } = useNavigation();
  const manageLibraryUrl = createAgentBuilderUrl(manageLibraryPath);
  const { euiTheme } = useEuiTheme();

  const {
    filteredItems,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    filterMode,
    setFilterMode,
    filterCounts,
  } = useLibrarySortFilter({
    allItems,
    activeItemIdSet,
    readOnlyItemIdSet,
    getItemName,
    getSearchableText,
  });

  return (
    <EuiFlyout
      side="right"
      size={FLYOUT_WIDTH}
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      pushMinBreakpoint="xs"
      hideCloseButton={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{libraryLabels.title}</h2>
            </EuiTitle>
            <EuiLink
              href={manageLibraryUrl}
              external
              css={css`
                margin-top: ${euiTheme.size.m};
                font-size: ${euiTheme.size.m};
              `}
            >
              {libraryLabels.manageLibraryLink}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={libraryLabels.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              incremental
              fullWidth
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LibrarySortFilterButton
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              filterMode={filterMode}
              onFilterChange={setFilterMode}
              filterCounts={filterCounts}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiText size="xs">
          {libraryLabels.availableSummary(filteredItems.length, allItems.length)}
        </EuiText>

        <EuiHorizontalRule margin="s" />

        {callout}

        {filteredItems.length === 0 ? (
          <EuiText size="s" color="subdued" textAlign="center">
            {searchQuery.trim() ? libraryLabels.noMatchMessage : libraryLabels.noItemsMessage}
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="none">
            {filteredItems.map((item) => (
              <EuiFlexItem key={item.id} grow={false}>
                <LibraryToggleRow
                  id={item.id}
                  name={getItemName(item)}
                  description={item.description}
                  isActive={activeItemIdSet.has(item.id)}
                  onToggle={(checked) => onToggleItem(item, checked)}
                  isMutating={mutatingItemId === item.id}
                  isDisabled={disabledItemIdSet?.has(item.id)}
                  isReadOnly={readOnlyItemIdSet?.has(item.id)}
                  disabledBadgeLabel={libraryLabels.disabledBadgeLabel}
                  disabledTooltipTitle={libraryLabels.disabledTooltipTitle}
                  disabledTooltipBody={libraryLabels.disabledTooltipBody}
                />
                <EuiHorizontalRule margin="m" />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
