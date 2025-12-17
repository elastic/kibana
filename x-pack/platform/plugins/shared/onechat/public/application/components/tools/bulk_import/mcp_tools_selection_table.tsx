/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiSearchBarOnChangeArgs, UseEuiTheme } from '@elastic/eui';
import {
  type EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiInMemoryTable,
  type EuiInMemoryTableProps,
  EuiPanel,
  EuiPopover,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Tool as McpTool } from '@kbn/mcp-client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { labels } from '../../../utils/i18n';
import { truncateAtSentence } from '../../../utils/truncate_at_sentence';
import type { McpToolField } from './types';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const tableContainerStyles = (isDisabled = false) => css`
  ${isDisabled &&
  `
    opacity: 0.5;
    pointer-events: none;
  `}
`;

const tableHeaderContainerStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-block-start: -${euiTheme.size.s};
`;

const tableHeaderStyles = css`
  min-height: 24px;
`;

const tableHeaderSkeletonStyles = css`
  display: inline-block;
  width: 200px;
`;

const tableHeaderButtonStyles = ({ euiTheme }: UseEuiTheme) => css`
  font-weight: ${euiTheme.font.weight.semiBold};
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
  const [searchQuery, setSearchQuery] = useState('');
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isSelectionPopoverOpen, toggleSelectionPopover] = useToggle(false);

  // Track when "select all" is active to prevent the table's internal selection
  // mechanism from limiting selection to only the visible page items.
  // Using a ref to avoid stale closure issues in the selection change callback.
  const isSelectAllActiveRef = useRef(false);

  const selectedMcpTools = useMemo(() => {
    const selectedNames = new Set(selectedTools.map((tool) => tool.name));
    return tools.filter((tool) => selectedNames.has(tool.name));
  }, [tools, selectedTools]);

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

  const paginationStart = Math.min(tablePageIndex * tablePageSize + 1, tools.length);
  const paginationEnd = Math.min((tablePageIndex + 1) * tablePageSize, tools.length);

  const handleSearchChange = useCallback(({ queryText }: EuiSearchBarOnChangeArgs) => {
    setSearchQuery(queryText);
  }, []);

  const handleSelectionChange = useCallback(
    (newSelection: McpTool[]) => {
      // When "select all" is active, the table fires onSelectionChange twice:
      // once with all items, then again limiting to visible page items.
      // Ignore the second call that would reduce the selection.
      if (isSelectAllActiveRef.current && newSelection.length < tools.length) {
        isSelectAllActiveRef.current = false;
        return;
      }
      onChange(newSelection);
    },
    [onChange, tools.length]
  );

  const handleClearSelection = useCallback(() => {
    isSelectAllActiveRef.current = false;
    onChange([]);
  }, [onChange]);

  const handleSelectAll = useCallback(() => {
    isSelectAllActiveRef.current = true;
    onChange([...tools]);
    toggleSelectionPopover(false);
  }, [onChange, tools, toggleSelectionPopover]);

  const closeSelectionPopover = useCallback(() => {
    toggleSelectionPopover(false);
  }, [toggleSelectionPopover]);

  const selection: EuiInMemoryTableProps<McpTool>['selection'] = useMemo(
    () => ({
      selectable: () => !isDisabled,
      selectableMessage: () => '',
      onSelectionChange: handleSelectionChange,
      selected: selectedMcpTools,
    }),
    [isDisabled, handleSelectionChange, selectedMcpTools]
  );

  const search: EuiInMemoryTableProps<McpTool>['search'] = useMemo(
    () => ({
      onChange: handleSearchChange,
      box: {
        incremental: true,
        placeholder: labels.tools.bulkImportMcp.sourceSection.searchPlaceholder,
        disabled: isDisabled || tools.length === 0,
        'data-test-subj': 'bulkImportMcpToolsSearchInput',
      },
    }),
    [handleSearchChange, isDisabled, tools.length]
  );

  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return labels.tools.bulkImportMcp.sourceSection.loadingToolsMessage;
    }
    if (isDisabled) {
      return disabledMessage ?? null;
    }
    if (searchQuery && tools.length > 0) {
      return labels.tools.bulkImportMcp.sourceSection.noMatchingToolsMessage;
    }
    if (tools.length === 0) {
      return labels.tools.bulkImportMcp.sourceSection.noToolsMessage;
    }
    return undefined;
  }, [isDisabled, isLoading, searchQuery, tools.length, disabledMessage]);

  const tableHeader = (
    <EuiSkeletonLoading
      isLoading={isLoading}
      css={tableHeaderContainerStyles}
      loadingContent={<EuiSkeletonText css={tableHeaderSkeletonStyles} lines={1} size="xs" />}
      loadedContent={
        tools.length > 0 ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" css={tableHeaderStyles}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.onechat.tools.bulkImportMcp.sourceSection.tableSummary"
                  defaultMessage="Showing {start}-{end} of {total}"
                  values={{
                    start: <strong>{paginationStart}</strong>,
                    end: <strong>{paginationEnd}</strong>,
                    total: tools.length,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            {selectedMcpTools.length > 0 && (
              <EuiFlexGroup gutterSize="none" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonEmpty
                        iconType="arrowDown"
                        iconSide="right"
                        iconSize="s"
                        size="xs"
                        onClick={toggleSelectionPopover}
                        data-test-subj="bulkImportMcpToolsSelectionPopoverButton"
                        css={tableHeaderButtonStyles}
                      >
                        {labels.tools.bulkImportMcp.sourceSection.selectedCount(
                          selectedMcpTools.length
                        )}
                      </EuiButtonEmpty>
                    }
                    isOpen={isSelectionPopoverOpen}
                    closePopover={closeSelectionPopover}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          key="selectAll"
                          icon="pagesSelect"
                          onClick={handleSelectAll}
                          data-test-subj="bulkImportMcpToolsSelectAllButton"
                        >
                          {labels.tools.selectAllToolsButtonLabel}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    iconSize="s"
                    size="xs"
                    color="danger"
                    onClick={handleClearSelection}
                    data-test-subj="bulkImportMcpToolsClearSelectionButton"
                    css={tableHeaderButtonStyles}
                  >
                    {labels.tools.bulkImportMcp.sourceSection.clearSelection}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexGroup>
        ) : null
      }
    />
  );

  return (
    <EuiPanel hasBorder paddingSize="m" css={tableContainerStyles(isDisabled)}>
      <EuiInMemoryTable
        items={tools as McpTool[]}
        columns={columns}
        itemId="name"
        selection={selection}
        search={search}
        onTableChange={({ page }: CriteriaWithPagination<McpTool>) => {
          if (page) {
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
