/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { ListKiBody } from './list_ki_body';
import { ListKiFooter } from './list_ki_footer';
import { ListKiFiltersRow } from './list_ki_filters_row';
import { useListKiPanel } from './use_list_ki_panel';
import { useListKiPanelStyles } from './list_ki_panel_styles';

interface ListKiPanelProps {
  aiIndex: GetAiIndexResponse;
  discoverHref?: string;
}

export const ListKiPanel = ({ aiIndex, discoverHref }: ListKiPanelProps) => {
  const {
    aiIndexId,
    typeFilter,
    summary,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    sort,
    searchText,
    onSearchTextChange,
    onSearchSubmit,
    kis,
    total,
    size,
    isLoading,
    isFetching,
    error,
    loadMore,
  } = useListKiPanel(aiIndex);

  const styles = useListKiPanelStyles();
  const isRefetching = isFetching && !isLoading;

  return (
    <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextListKiPanel">
      <ListKiFiltersRow
        searchText={searchText}
        isSearchLoading={isRefetching}
        onSearchTextChange={onSearchTextChange}
        onSearchSubmit={onSearchSubmit}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        sort={sort}
        typeFilter={typeFilter}
        summary={summary}
        onTypeFilterChange={onTypeFilterChange}
      />

      <div css={styles.split} data-test-subj="contextListKiSplit">
        <div css={styles.list} data-test-subj="contextListKiList">
          <ListKiBody
            aiIndexId={aiIndexId}
            kis={kis}
            isLoading={isLoading}
            isRefetching={isRefetching}
            error={error}
          />

          <ListKiFooter
            loadedCount={kis.length}
            total={total}
            size={size}
            isLoading={isFetching}
            discoverHref={discoverHref}
            onLoadMore={loadMore}
          />
        </div>
        <div css={styles.viewerColumn} data-test-subj="contextListKiViewerColumn" />
      </div>
    </EuiPanel>
  );
};
