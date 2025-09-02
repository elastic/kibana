/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, EuiSearchBar } from '@elastic/eui';
import type { ToolSelection, ToolDefinition, ToolType } from '@kbn/onechat-common';
import { filterToolsBySelection, activeToolsCountWarningThreshold } from '@kbn/onechat-common';
import { toggleTypeSelection, toggleToolSelection } from '../../../utils/tool_selection_utils';
import { ActiveToolsStatus } from './active_tools_status';
import { ToolsSearchControls } from './tools_search_controls';
import { ToolsFlatView } from './tools_flat_view';
import { ToolsGroupedView } from './tools_grouped_view';

interface ToolsSelectionProps {
  tools: ToolDefinition[];
  toolsLoading: boolean;
  selectedTools: ToolSelection[];
  onToolsChange: (tools: ToolSelection[]) => void;
  disabled?: boolean;
  showActiveOnly?: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
  showGroupedView?: boolean;
  onShowGroupedViewChange?: (showGroupedView: boolean) => void;
}

export const ToolsSelection: React.FC<ToolsSelectionProps> = ({
  tools,
  toolsLoading,
  selectedTools,
  onToolsChange,
  disabled = false,
  showActiveOnly = false,
  onShowActiveOnlyChange,
  showGroupedView = true,
  onShowGroupedViewChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const displayTools = useMemo(() => {
    let result = tools;

    if (showActiveOnly) {
      result = tools.filter((tool) => {
        return selectedTools.some((selection) => {
          if (selection.type && selection.type !== tool.type) {
            return false;
          }
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

  const toolsByType = useMemo(() => {
    const grouped: Partial<Record<ToolType, ToolDefinition[]>> = {};
    filteredTools.forEach((tool) => {
      const toolType = tool.type;
      if (!grouped[toolType]) {
        grouped[toolType] = [];
      }
      grouped[toolType]!.push(tool);
    });
    return grouped;
  }, [filteredTools]);

  const activeToolsCount = useMemo(() => {
    return filterToolsBySelection(tools, selectedTools).length;
  }, [tools, selectedTools]);

  const handleToggleTypeTools = useCallback(
    (type: ToolType) => {
      const typeTools = toolsByType[type] || [];
      const newSelection = toggleTypeSelection(type, typeTools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, toolsByType]
  );

  const handleToggleTool = useCallback(
    (toolId: string, type: ToolType) => {
      const typeTools = toolsByType[type] || [];
      const newSelection = toggleToolSelection(toolId, type, typeTools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, toolsByType]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPageIndex(0);
  }, []);

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
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
        showGroupedView={showGroupedView}
        onShowGroupedViewChange={onShowGroupedViewChange}
        showActiveOnly={showActiveOnly}
        onShowActiveOnlyChange={onShowActiveOnlyChange}
        disabled={disabled}
      />

      <EuiSpacer size="m" />

      {!showGroupedView ? (
        <ToolsFlatView
          tools={filteredTools}
          selectedTools={selectedTools}
          onToggleTool={handleToggleTool}
          disabled={disabled}
          pageIndex={pageIndex}
          onPageChange={handlePageChange}
        />
      ) : (
        <ToolsGroupedView
          toolsByType={toolsByType}
          selectedTools={selectedTools}
          onToggleTool={handleToggleTool}
          onToggleTypeTools={handleToggleTypeTools}
          disabled={disabled}
        />
      )}
    </div>
  );
};
