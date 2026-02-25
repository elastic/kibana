/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import {
  type EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiInMemoryTable,
  type EuiInMemoryTableProps,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Tool as McpTool } from '@kbn/mcp-client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { labels } from '../../../utils/i18n';
import { truncateAtSentence } from '../../../utils/truncate_at_sentence';
import { McpToolsSelectionTableHeader } from './mcp_tools_selection_table_header';
import type { McpToolField } from './types';
import { useMcpToolsSearch } from './use_mcp_tools_search';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const tableContainerStyles = (isDisabled = false) => css`
  ${isDisabled &&
  `
    opacity: 0.5;
    pointer-events: none;
  `}
`;

export interface McpToolsSelectionTableProps {
  tools: readonly McpTool[];
  selectedTools: McpToolField[];
  onChange: (tools: McpTool[]) => void;
  isLoading: boolean;
  isError: boolean;
  isDisabled: boolean;
  disabledMessage?: string;
}

export const McpToolsSelectionTable: React.FC<McpToolsSelectionTableProps> = ({
  tools,
  selectedTools,
  onChange,
  isLoading,
  isError,
  isDisabled,
  disabledMessage,
}) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE);

  // Track when "select all" is active to prevent the table's internal selection
  // mechanism from limiting selection to only the visible page items.
  // Using a ref to avoid stale closure issues in the selection change callback.
  const isSelectAllActiveRef = useRef(false);

  // EuiBasicTable.onPageChange/onPageSizeChange call clearSelection() which
  // fires onSelectionChange([]) before the onTableChange callback. We track
  // this so handleSelectionChange can ignore the spurious clear.
  const isPageChangeActiveRef = useRef(false);

  const {
    searchConfig,
    searchQuery,
    results: filteredTools,
  } = useMcpToolsSearch({ tools, isDisabled });

  // Reset page index when filtered results change
  useEffect(() => {
    setTablePageIndex(0);
  }, [filteredTools]);

  const selectedMcpTools = useMemo(() => {
    const selectedNames = new Set(selectedTools.map((tool) => tool.name));
    return tools.filter((tool) => selectedNames.has(tool.name));
  }, [tools, selectedTools]);

  // Only pass current-page selections to EUI's selection.selected to prevent
  // EuiBasicTable.getDerivedStateFromProps from filtering out off-page items
  // and firing a spurious onSelectionChange that would erase cross-page state.
  // We must sort filteredTools to match EUI's internal sort (name asc) before
  // slicing, otherwise we'd pick the wrong items for the page.
  const currentPageNames = useMemo(() => {
    const sorted = [...filteredTools].sort((a, b) => a.name.localeCompare(b.name));
    const pageStart = tablePageIndex * tablePageSize;
    return new Set(sorted.slice(pageStart, pageStart + tablePageSize).map((t) => t.name));
  }, [filteredTools, tablePageIndex, tablePageSize]);

  const currentPageSelectedTools = useMemo(
    () => selectedMcpTools.filter((t) => currentPageNames.has(t.name)),
    [selectedMcpTools, currentPageNames]
  );

  const columns: Array<EuiBasicTableColumn<McpTool>> = useMemo(
    () => [
      {
        field: 'name',
        name: labels.tools.bulkImportMcp.sourceSection.nameColumn,
        sortable: true,
        render: (name: string, tool: McpTool) => {
          const shortDescription = tool.description
            ? truncateAtSentence(tool.description)
            : undefined;
          return (
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    <EuiHighlight search={searchQuery}>{name}</EuiHighlight>
                  </strong>
                </EuiText>
              </EuiFlexItem>
              {shortDescription && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <EuiHighlight search={searchQuery}>{shortDescription}</EuiHighlight>
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
    ],
    [searchQuery]
  );

  const handleSelectionChange = useCallback(
    (newSelection: McpTool[]) => {
      // When "select all" is active, the table fires onSelectionChange twice:
      // once with all items, then again limiting to visible page items.
      // Ignore the second call that would reduce the selection.
      if (isSelectAllActiveRef.current && newSelection.length < tools.length) {
        isSelectAllActiveRef.current = false;
        return;
      }

      // EUI only provides current-page items in newSelection, so merge with
      // off-page selections to preserve cross-page checkbox state.
      const otherPageSelections = selectedMcpTools.filter((t) => !currentPageNames.has(t.name));
      const merged = [...otherPageSelections, ...newSelection];

      // EuiBasicTable.onPageChange/onPageSizeChange call clearSelection()
      // which fires onSelectionChange([]) synchronously BEFORE our
      // onTableChange callback. We detect this by deferring empty-selection
      // calls to a microtask: if onTableChange runs between now and the
      // microtask (same synchronous stack), it's a page change and we skip.
      if (newSelection.length === 0 && currentPageSelectedTools.length > 0) {
        isPageChangeActiveRef.current = false;
        queueMicrotask(() => {
          if (isPageChangeActiveRef.current) {
            isPageChangeActiveRef.current = false;
            return;
          }
          onChange(merged);
        });
        return;
      }

      onChange(merged);
    },
    [onChange, tools.length, currentPageNames, selectedMcpTools, currentPageSelectedTools]
  );

  const handleClearSelection = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleSelectAll = useCallback(() => {
    isSelectAllActiveRef.current = true;
    onChange([...tools]);
  }, [onChange, tools]);

  const selection: EuiInMemoryTableProps<McpTool>['selection'] = useMemo(
    () => ({
      selectable: () => !isDisabled,
      selectableMessage: () => '',
      onSelectionChange: handleSelectionChange,
      selected: currentPageSelectedTools,
    }),
    [isDisabled, handleSelectionChange, currentPageSelectedTools]
  );

  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return labels.tools.bulkImportMcp.sourceSection.loadingToolsMessage;
    }
    if (isDisabled) {
      return disabledMessage ?? null;
    }
    if (searchQuery && tools.length > 0 && filteredTools.length === 0) {
      return labels.tools.bulkImportMcp.sourceSection.noMatchingToolsMessage;
    }
    if (tools.length === 0) {
      return labels.tools.bulkImportMcp.sourceSection.noToolsMessage;
    }
    return undefined;
  }, [isDisabled, isLoading, searchQuery, tools.length, filteredTools.length, disabledMessage]);

  const tableHeader = (
    <McpToolsSelectionTableHeader
      isLoading={isLoading}
      pageIndex={tablePageIndex}
      pageSize={tablePageSize}
      totalCount={filteredTools.length}
      selectedCount={selectedMcpTools.length}
      onSelectAll={handleSelectAll}
      onClearSelection={handleClearSelection}
    />
  );

  return (
    <EuiPanel hasBorder paddingSize="m" css={tableContainerStyles(isDisabled)}>
      <EuiInMemoryTable
        items={filteredTools}
        columns={columns}
        itemId="name"
        selection={selection}
        search={searchConfig}
        onTableChange={({ page }: CriteriaWithPagination<McpTool>) => {
          if (page) {
            isPageChangeActiveRef.current = true;
            setTablePageIndex(page.index);
            if (page.size !== tablePageSize) {
              setTablePageSize(page.size);
              setTablePageIndex(0);
            }
          }
        }}
        pagination={{
          initialPageSize: DEFAULT_PAGE_SIZE,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showPerPageOptions: true,
          pageIndex: tablePageIndex,
          pageSize: tablePageSize,
        }}
        sorting={{
          sort: {
            field: 'name',
            direction: 'asc',
          },
        }}
        loading={isLoading}
        error={isError ? labels.tools.bulkImportMcp.sourceSection.toolsErrorMessage : undefined}
        noItemsMessage={emptyMessage}
        tableCaption={labels.tools.bulkImportMcp.sourceSection.tableCaption}
        childrenBetween={tableHeader}
        rowProps={(item) => ({
          'data-test-subj': `bulkImportMcpToolsTableRow-${item.name}`,
        })}
        data-test-subj="bulkImportMcpToolsTable"
      />
    </EuiPanel>
  );
};
