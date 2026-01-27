/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiInMemoryTable, EuiSkeletonText, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import React, { memo, useEffect, useState } from 'react';
import { useToolsService } from '../../../hooks/tools/use_tools';
import { labels } from '../../../utils/i18n';
import { useToolsTableColumns } from './tools_table_columns';
import { ToolsTableHeader } from './tools_table_header';
import { toolQuickActionsHoverStyles } from './tools_table_quick_actions';
import { useToolsTableSearch } from './tools_table_search';

export const AgentBuilderToolsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const { tools, isLoading: isLoadingTools, error: toolsError } = useToolsService();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [selectedTools, setSelectedTools] = useState<ToolDefinition[]>([]);
  const { searchConfig, results: tableTools } = useToolsTableSearch();
  const columns = useToolsTableColumns();

  useEffect(() => {
    setTablePageIndex(0);
  }, [tableTools]);

  return (
    <EuiInMemoryTable
      tableCaption={labels.tools.toolsTableCaption(tools.length)}
      data-test-subj="agentBuilderToolsTable"
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
      onTableChange={({ page }: CriteriaWithPagination<ToolDefinition>) => {
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
        pageSizeOptions: [10, 25, 50, 100],
        showPerPageOptions: true,
      }}
      rowProps={(tool) => ({
        'data-test-subj': `agentBuilderToolsTableRow-${tool.id}`,
      })}
      selection={{
        selectable: (tool) => !tool.readonly,
        onSelectionChange: (selectedItems: ToolDefinition[]) => {
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
