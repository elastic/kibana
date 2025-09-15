/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiInMemoryTable, EuiSkeletonText, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { useToolsService } from '../../../hooks/tools/use_tools';
import { labels } from '../../../utils/i18n';
import { getToolsTableColumns } from './tools_table_columns';
import { ToolsTableHeader } from './tools_table_header';
import { toolQuickActionsHoverStyles } from './tools_table_quick_actions';
import { useToolsTableSearch } from './tools_table_search';

export const OnechatToolsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const { tools, isLoading: isLoadingTools, error: toolsError } = useToolsService();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [selectedTools, setSelectedTools] = useState<ToolDefinitionWithSchema[]>([]);
  const { searchConfig, results: tableTools } = useToolsTableSearch();

  useEffect(() => {
    setTablePageIndex(0);
  }, [tableTools]);

  const columns = useMemo(() => getToolsTableColumns(), []);

  return (
    <EuiInMemoryTable
      css={css`
        border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
        table {
          background-color: transparent; /* Ensure top border visibility */
        }
        ${toolQuickActionsHoverStyles}
      `}
      childrenBetween={
        <ToolsTableHeader
          isLoading={isLoadingTools}
          pageIndex={tablePageIndex}
          tools={tableTools}
          total={tools.length}
          selectedTools={selectedTools}
          setSelectedTools={setSelectedTools}
        />
      }
      loading={isLoadingTools}
      columns={columns}
      items={tableTools}
      itemId="id"
      error={toolsError ? labels.tools.listToolsErrorMessage : undefined}
      search={searchConfig}
      onTableChange={({ page: { index } }: CriteriaWithPagination<ToolDefinitionWithSchema>) => {
        setTablePageIndex(index);
      }}
      pagination={{
        pageIndex: tablePageIndex,
        pageSize: 10,
        showPerPageOptions: false,
      }}
      selection={{
        selectable: (tool) => !tool.readonly,
        onSelectionChange: (selectedItems: ToolDefinitionWithSchema[]) => {
          setSelectedTools(selectedItems);
        },
        selected: selectedTools,
      }}
      sorting={{
        sort: {
          field: 'id',
          direction: 'asc',
        },
      }}
      noItemsMessage={
        isLoadingTools ? (
          <EuiSkeletonText lines={1} />
        ) : (
          <EuiText component="p" size="s" textAlign="center" color="subdued">
            {tools.length > 0 && tableTools.length === 0
              ? labels.tools.noEsqlToolsMatchMessage
              : labels.tools.noEsqlToolsMessage}
          </EuiText>
        )
      }
    />
  );
});
