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
}

export const ListKiPanel = ({ aiIndex }: ListKiPanelProps) => {
  const {
    aiIndexId,
    typeFilter,
    typeFilterOptions,
    onTypeFilterChange,
    kis,
    total,
    size,
    isLoading,
    isFetching,
    error,
    discoverHref,
    indexManagementHref,
    destValue,
    loadMore,
  } = useListKiPanel(aiIndex);

  return (
    <div data-test-subj="contextListKiPanel">
      <ListKiHeader
        destValue={destValue}
        indexManagementHref={indexManagementHref}
        discoverHref={discoverHref}
        typeFilter={typeFilter}
        typeFilterOptions={typeFilterOptions}
        onTypeFilterChange={onTypeFilterChange}
      />

      <EuiSpacer size="l" />

      <ListKiBody aiIndexId={aiIndexId} kis={kis} isLoading={isLoading} error={error} />

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
