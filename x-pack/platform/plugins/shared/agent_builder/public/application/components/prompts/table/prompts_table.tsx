/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiSearchBar,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo, useCallback, useState } from 'react';
import type { UserPrompt } from '../../../../../common/http_api/user_prompts';
import { usePrompts } from '../../../hooks/prompts/use_prompts';
import { usePromptsTableSearch } from '../../../hooks/prompts/use_prompts_table_search';
import { labels } from '../../../utils/i18n';

// Placeholder columns - will be replaced with actual columns later
const getPromptsTableColumns = () => [
  {
    field: 'id',
    name: 'ID',
  },
];

export const AgentBuilderPromptsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const resetPage = useCallback(() => {
    setTablePageIndex(0);
  }, []);

  const { searchConfig, searchQuery } = usePromptsTableSearch({
    onSearchChange: resetPage,
  });

  const { prompts, total, isLoading, error } = usePrompts({
    // EuiBasicTable uses 0-based page indices (first page = 0), but the API expects 1-based page numbers (first page = 1)
    page: tablePageIndex + 1,
    per_page: tablePageSize,
    query: searchQuery || undefined,
  });

  const columns = getPromptsTableColumns();

  return (
    <>
      <EuiSearchBar {...searchConfig} />
      <EuiSpacer size="m" />
      <EuiBasicTable<UserPrompt>
        tableCaption={labels.prompts.promptsTableCaption(total)}
        data-test-subj="agentBuilderPromptsTable"
        css={css`
          border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
          table {
            background-color: transparent; /* Ensure top border visibility */
          }
        `}
        loading={isLoading}
        columns={columns}
        items={prompts}
        itemId="id"
        error={error ? labels.prompts.listPromptsErrorMessage : undefined}
        onChange={({ page }: CriteriaWithPagination<UserPrompt>) => {
          if (page) {
            setTablePageIndex(page.index);
            if (page.size !== tablePageSize) {
              setTablePageSize(page.size);
              setTablePageIndex(0);
            }
          }
        }}
        pagination={{
          pageIndex: tablePageIndex,
          pageSize: tablePageSize,
          totalItemCount: total,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        rowProps={(prompt) => ({
          'data-test-subj': `agentBuilderPromptsTableRow-${prompt.id}`,
        })}
        noItemsMessage={
          isLoading ? (
            <EuiSkeletonText lines={1} />
          ) : (
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {searchQuery && total === 0
                ? labels.prompts.noPromptsMatchMessage
                : labels.prompts.noPromptsMessage}
            </EuiText>
          )
        }
      />
    </>
  );
});
