/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { FilterCounts, FilterMode, SortOrder } from './use_library_sort_filter';

const POPOVER_WIDTH = 250;

const labels = {
  buttonAriaLabel: i18n.translate('xpack.agentBuilder.libraryPanel.sortFilterButton.ariaLabel', {
    defaultMessage: 'Sort and filter',
  }),
  sortSectionTitle: i18n.translate('xpack.agentBuilder.libraryPanel.sortFilterButton.sortTitle', {
    defaultMessage: 'Sort',
  }),
  sortAscLabel: i18n.translate('xpack.agentBuilder.libraryPanel.sortFilterButton.sortAsc', {
    defaultMessage: 'Name: A → Z',
  }),
  sortDescLabel: i18n.translate('xpack.agentBuilder.libraryPanel.sortFilterButton.sortDesc', {
    defaultMessage: 'Name: Z → A',
  }),
  filterSectionTitle: i18n.translate(
    'xpack.agentBuilder.libraryPanel.sortFilterButton.filterTitle',
    { defaultMessage: 'Filter' }
  ),
  filterAllLabel: i18n.translate('xpack.agentBuilder.libraryPanel.sortFilterButton.filterAll', {
    defaultMessage: 'All',
  }),
  filterActiveLabel: i18n.translate(
    'xpack.agentBuilder.libraryPanel.sortFilterButton.filterActive',
    { defaultMessage: 'Assigned to this agent' }
  ),
  filterElasticLabel: i18n.translate(
    'xpack.agentBuilder.libraryPanel.sortFilterButton.filterElastic',
    { defaultMessage: 'By Elastic' }
  ),
  filterCustomLabel: i18n.translate(
    'xpack.agentBuilder.libraryPanel.sortFilterButton.filterCustom',
    { defaultMessage: 'Custom' }
  ),
};

interface LibrarySortFilterButtonProps {
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  filterCounts: FilterCounts;
}

export const LibrarySortFilterButton: React.FC<LibrarySortFilterButtonProps> = ({
  sortOrder,
  onSortChange,
  filterMode,
  onFilterChange,
  filterCounts,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const sortTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();

  const SectionTitle = ({ id, title }: { id?: string; title: string }) => (
    <EuiText
      id={id}
      size="xs"
      css={css`
        padding: ${euiTheme.size.m};
        font-weight: ${euiTheme.font.weight.semiBold};
      `}
    >
      {title}
    </EuiText>
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      panelStyle={{ width: POPOVER_WIDTH }}
      anchorPosition="downRight"
      aria-labelledby={sortTitleId}
      button={
        <EuiButtonIcon
          display="base"
          iconType="filter"
          aria-label={labels.buttonAriaLabel}
          color="text"
          size="m"
          onClick={() => setIsOpen((o) => !o)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiPopoverTitle paddingSize="none">
        <SectionTitle id={sortTitleId} title={labels.sortSectionTitle} />
      </EuiPopoverTitle>
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="sort-asc"
            icon={sortOrder === 'asc' ? 'check' : 'empty'}
            onClick={() => onSortChange('asc')}
          >
            {labels.sortAscLabel}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="sort-desc"
            icon={sortOrder === 'desc' ? 'check' : 'empty'}
            onClick={() => onSortChange('desc')}
          >
            {labels.sortDescLabel}
          </EuiContextMenuItem>,
        ]}
      />
      <EuiHorizontalRule margin="none" />
      <SectionTitle title={labels.filterSectionTitle} />
      <EuiHorizontalRule margin="none" />
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="filter-all"
            icon={filterMode === 'all' ? 'check' : 'empty'}
            onClick={() => onFilterChange('all')}
          >
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>{labels.filterAllLabel}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued">{filterCounts.all}</EuiNotificationBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="filter-active"
            icon={filterMode === 'active' ? 'check' : 'empty'}
            onClick={() => onFilterChange('active')}
          >
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>{labels.filterActiveLabel}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued">{filterCounts.active}</EuiNotificationBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="filter-elastic"
            icon={filterMode === 'elastic' ? 'check' : 'empty'}
            onClick={() => onFilterChange('elastic')}
          >
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>{labels.filterElasticLabel}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued">{filterCounts.elastic}</EuiNotificationBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="filter-custom"
            icon={filterMode === 'custom' ? 'check' : 'empty'}
            onClick={() => onFilterChange('custom')}
          >
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>{labels.filterCustomLabel}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued">{filterCounts.custom}</EuiNotificationBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
