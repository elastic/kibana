/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, EuiSearchBar } from '@elastic/eui';
import type { ToolSelection, ToolDefinition } from '@kbn/agent-builder-common';
import {
  filterToolsBySelection,
  activeToolsCountWarningThreshold,
} from '@kbn/agent-builder-common';
import { toggleToolSelection } from '../../../utils/tool_selection_utils';
import { ActiveToolsStatus } from './active_tools_status';
import { ToolsSearchControls } from './tools_search_controls';
import { ToolsFlatView } from './tools_flat_view';

interface ToolsSelectionProps {
  tools: ToolDefinition[];
  toolsLoading: boolean;
  selectedTools: ToolSelection[];
  onToolsChange: (tools: ToolSelection[]) => void;
  disabled?: boolean;
  showActiveOnly?: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
}

export const ToolsSelection: React.FC<ToolsSelectionProps> = ({
  tools,
  toolsLoading,
  selectedTools,
  onToolsChange,
  disabled = false,
  showActiveOnly = false,
  onShowActiveOnlyChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const displayTools = useMemo(() => {
    let result = tools;

    if (showActiveOnly) {
      result = tools.filter((tool) => {
        return selectedTools.some((selection) => {
          return selection.tool_ids.includes(tool.id) || selection.tool_ids.includes('*');
        });
      });
    }

    return result;
  }, [tools, showActiveOnly, selectedTools]);

  const filteredTools = useMemo(() => {
    if (!searchQuery) {
      return displayTools;
    }

    return EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), displayTools, {
      defaultFields: ['id', 'description', 'type'],
    });
  }, [searchQuery, displayTools]);

  const activeToolsCount = useMemo(() => {
    return filterToolsBySelection(tools, selectedTools).length;
  }, [tools, selectedTools]);

  const handleToggleTool = useCallback(
    (toolId: string) => {
      const newSelection = toggleToolSelection(toolId, tools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, tools]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPageIndex(0);
  }, []);

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  }, []);

  if (toolsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <div>
      <ActiveToolsStatus
        activeToolsCount={activeToolsCount}
        warningThreshold={activeToolsCountWarningThreshold}
      />

      <EuiSpacer size="l" />

      <ToolsSearchControls
        displayTools={displayTools}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        showActiveOnly={showActiveOnly}
        onShowActiveOnlyChange={onShowActiveOnlyChange}
        disabled={disabled}
      />

      <EuiSpacer size="m" />

      <ToolsFlatView
        tools={filteredTools}
        selectedTools={selectedTools}
        onToggleTool={handleToggleTool}
        disabled={disabled}
        pageIndex={pageIndex}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};
