/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiSearchBar,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  formatDate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { UserPrompt } from '../../../../../common/http_api/user_prompts';
import { usePrompts } from '../../../hooks/prompts/use_prompts';
import { usePromptsTableSearch } from '../../../hooks/prompts/use_prompts_table_search';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { searchParamNames } from '../../../search_param_names';
import { labels } from '../../../utils/i18n';
import { PromptFormModal } from '../prompt_form_modal';
import { DeletePromptModal } from '../delete_prompt_modal';
import { PromptsQuickActions } from './prompts_table_quick_actions';

const MAX_CONTENT_PREVIEW_LENGTH = 100;

const promptsQuickActionsHoverStyles = css`
  .euiTableRow:hover .prompts-quick-actions {
    visibility: visible;
  }
`;

const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.substring(0, maxLength)}...`;
};

export const AgentBuilderPromptsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [editPromptId, setEditPromptId] = useState<string | undefined>();
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; name: string } | undefined>();

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

  const { createAgentBuilderUrl } = useNavigation();

  const handleEdit = useCallback((promptId: string) => {
    setEditPromptId(promptId);
  }, []);

  const handleDelete = useCallback(
    (promptId: string) => {
      const prompt = prompts.find((p) => p.id === promptId);
      if (prompt) {
        setDeletePrompt({ id: promptId, name: prompt.name });
      }
    },
    [prompts]
  );

  const dateFormat = useUiSetting<string>('dateFormat');

  const columns: Array<EuiBasicTableColumn<UserPrompt>> = useMemo(
    () => [
      {
        field: 'name',
        name: labels.prompts.nameLabel,
        width: '20%',
        render: (name: string) => (
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
        ),
      },
      {
        field: 'content',
        name: labels.prompts.contentLabel,
        width: '60%',
        render: (content: string) => (
          <EuiText size="s" color="subdued">
            {truncateContent(content, MAX_CONTENT_PREVIEW_LENGTH)}
          </EuiText>
        ),
      },
      {
        field: 'updated_at',
        name: labels.prompts.updatedAtLabel,
        width: '15%',
        render: (updatedAt: string) => (
          <EuiText size="s" color="subdued">
            {formatDate(updatedAt, dateFormat)}
          </EuiText>
        ),
      },
      {
        width: '100px',
        align: 'right',
        name: '',
        render: (prompt: UserPrompt) => (
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
            <PromptsQuickActions
              prompt={prompt}
              startChatHref={createAgentBuilderUrl(appPaths.chat.new, {
                [searchParamNames.promptId]: prompt.id,
              })}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </EuiFlexGroup>
        ),
      },
    ],
    [dateFormat, createAgentBuilderUrl, handleEdit, handleDelete]
  );

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
          ${promptsQuickActionsHoverStyles}
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
      <PromptFormModal
        isOpen={!!editPromptId}
        onClose={() => setEditPromptId(undefined)}
        promptId={editPromptId}
      />
      {deletePrompt && (
        <DeletePromptModal
          isOpen={!!deletePrompt}
          onClose={() => setDeletePrompt(undefined)}
          promptId={deletePrompt.id}
          promptName={deletePrompt.name}
        />
      )}
    </>
  );
});
