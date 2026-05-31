/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer, EuiSearchBar } from '@elastic/eui';
import type { ToolSelection, ToolDefinition } from '@kbn/agent-builder-common';
import { activeToolsCountWarningThreshold, defaultAgentToolIds } from '@kbn/agent-builder-common';
import { getActiveTools, toggleToolSelection } from '../../../utils/tool_selection_utils';
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
  areElasticCapabilitiesEnabled?: boolean;
}

export const ToolsSelection: React.FC<ToolsSelectionProps> = ({
  tools,
  toolsLoading,
  selectedTools,
  onToolsChange,
  disabled = false,
  showActiveOnly = false,
  onShowActiveOnlyChange,
  areElasticCapabilitiesEnabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const defaultToolIdSet = useMemo(() => new Set<string>(defaultAgentToolIds), []);

  const activeTools = useMemo(
    () => getActiveTools(tools, selectedTools, areElasticCapabilitiesEnabled, defaultToolIdSet),
    [tools, selectedTools, areElasticCapabilitiesEnabled, defaultToolIdSet]
  );

  const activeToolIdSet = useMemo(() => new Set(activeTools.map((t) => t.id)), [activeTools]);

  const displayTools = useMemo(() => {
    if (showActiveOnly) {
      return tools.filter((tool) => activeToolIdSet.has(tool.id));
    }
    return tools;
  }, [tools, showActiveOnly, activeToolIdSet]);

  const filteredTools = useMemo(() => {
    if (!searchQuery) {
      return displayTools;
    }

    return EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), displayTools, {
      defaultFields: ['id', 'description', 'type'],
    });
  }, [searchQuery, displayTools]);

  const activeToolsCount = activeTools.length;

  const handleToggleTool = useCallback(
    (toolId: string) => {
      if (areElasticCapabilitiesEnabled && defaultToolIdSet.has(toolId)) return;
      const newSelection = toggleToolSelection(toolId, tools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, tools, areElasticCapabilitiesEnabled, defaultToolIdSet]
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
        areElasticCapabilitiesEnabled={areElasticCapabilitiesEnabled}
        defaultToolIdSet={defaultToolIdSet}
      />
    </div>
  );
};
