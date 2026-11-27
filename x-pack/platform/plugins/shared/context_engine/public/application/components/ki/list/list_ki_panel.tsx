/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { KiViewer } from '../view/ki_viewer';
import { ListKiBody } from './list_ki_body';
import { ListKiFiltersRow } from './list_ki_filters_row';
import { ListKiHeader } from './list_ki_header';
import { ListKiTypeTiles } from './list_ki_type_tiles';
import { useListKiPanel } from './use_list_ki_panel';
import { useListKiPanelStyles } from './list_ki_panel_styles';

interface ListKiPanelProps {
  aiIndex: GetAiIndexResponse;
  discoverHref?: string;
}

/** The Knowledge documents tab: header, type tiles, filters row, then the list next to the viewer. */
export const ListKiPanel = ({ aiIndex, discoverHref }: ListKiPanelProps) => {
  const {
    aiIndexId,
    total,
    tiles,
    selection,
    onToggleTile,
    statusFilter,
    onStatusFilterChange,
    sort,
    onSortChange,
    searchText,
    onSearchTextChange,
    onSearchSubmit,
    hasActiveFilters,
    clearFilters,
    groups,
    showMore,
    selectedKi,
    selectKi,
    isLoading,
    isFetching,
    error,
  } = useListKiPanel(aiIndex);

  const styles = useListKiPanelStyles();
  const isRefetching = isFetching && !isLoading;

  return (
    <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextListKiPanel">
      <ListKiHeader
        total={total}
        isLoading={isLoading}
        hasError={Boolean(error)}
        discoverHref={discoverHref}
      />
      <ListKiTypeTiles
        tiles={tiles}
        total={total}
        selection={selection}
        onToggleTile={onToggleTile}
        isLoading={isLoading}
      />
      <ListKiFiltersRow
        searchText={searchText}
        isSearchLoading={isRefetching}
        onSearchTextChange={onSearchTextChange}
        onSearchSubmit={onSearchSubmit}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        sort={sort}
        onSortChange={onSortChange}
      />

      <ListKiBody
        aiIndexId={aiIndexId}
        groups={groups}
        selectedKi={selectedKi}
        onSelectKi={selectKi}
        onShowMore={showMore}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        isLoading={isLoading}
        isRefetching={isRefetching}
        error={error}
        discoverHref={discoverHref}
        viewer={
          selectedKi ? (
            <KiViewer
              key={`${selectedKi.index}:${selectedKi.kiId}`}
              aiIndexId={aiIndexId}
              selectedKi={selectedKi}
            />
          ) : null
        }
      />
    </EuiPanel>
  );
};
