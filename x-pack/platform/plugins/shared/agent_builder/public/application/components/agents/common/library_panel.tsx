/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useNavigation } from '../../../hooks/use_navigation';
import { LibraryToggleRow } from './library_toggle_row';
import { FLYOUT_WIDTH } from './constants';

export interface LibraryItem {
  id: string;
  description: string;
}

export interface LibraryPanelLabels {
  title: string;
  manageLibraryLink: string;
  searchPlaceholder: string;
  availableSummary: (filtered: number, total: number) => string;
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
  callout,
}: LibraryPanelProps<T>) => {
  const { createAgentBuilderUrl } = useNavigation();
  const manageLibraryUrl = createAgentBuilderUrl(manageLibraryPath);
  const [searchQuery, setSearchQuery] = useState('');
  const { euiTheme } = useEuiTheme();

  const getSearchFields = useCallback(
    (item: T): string[] =>
      getSearchableText ? getSearchableText(item) : [getItemName(item), item.description],
    [getSearchableText, getItemName]
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const lower = searchQuery.toLowerCase();
    return allItems.filter((item) =>
      getSearchFields(item).some((field) => field.toLowerCase().includes(lower))
    );
  }, [allItems, searchQuery, getSearchFields]);

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
        <EuiFieldSearch
          placeholder={libraryLabels.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          incremental
          fullWidth
        />

        <EuiSpacer size="m" />

        <EuiText size="xs" color="subdued">
          {libraryLabels.availableSummary(filteredItems.length, allItems.length)}
        </EuiText>

        <EuiSpacer size="m" />

        {callout}

        {filteredItems.length === 0 ? (
          <EuiText size="s" color="subdued" textAlign="center">
            {searchQuery.trim() ? libraryLabels.noMatchMessage : libraryLabels.noItemsMessage}
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m">
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
                  disabledBadgeLabel={libraryLabels.disabledBadgeLabel}
                  disabledTooltipTitle={libraryLabels.disabledTooltipTitle}
                  disabledTooltipBody={libraryLabels.disabledTooltipBody}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
