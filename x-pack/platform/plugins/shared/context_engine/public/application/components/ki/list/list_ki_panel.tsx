/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { ListKiBody } from './list_ki_body';
import { ListKiFooter } from './list_ki_footer';
import { ListKiHeader } from './list_ki_header';
import { useListKiPanel } from './use_list_ki_panel';

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
    searchText,
    submittedQuery,
    onSearchTextChange,
    onSearchSubmit,
    kis,
    total,
    size,
    isLoading,
    isFetching,
    error,
    loadMore,
    onSearchSubmitClick,
  } = useListKiPanel(aiIndex);

  const isRefetching = isFetching && !isLoading;

  return (
    <div data-test-subj="contextListKiPanel">
      <ListKiHeader
        searchText={searchText}
        submittedQuery={submittedQuery}
        isSearchLoading={isRefetching}
        onSearchTextChange={onSearchTextChange}
        onSearchSubmit={onSearchSubmit}
        typeFilter={typeFilter}
        summary={summary}
        onTypeFilterChange={onTypeFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        onSearchSubmitClick={onSearchSubmitClick}
      />

      <EuiSpacer size="l" />

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
  );
};
