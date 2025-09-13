/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection, ToolSelectionRelevantFields } from '@kbn/onechat-common';
import { allToolsSelectionWildcard, toolMatchSelection } from '@kbn/onechat-common';

/**
 * Check if a specific tool is selected based on the current tool selection.
 * This uses existing onechat-common utilities for consistent logic.
 */
export const isToolSelected = (
  tool: ToolSelectionRelevantFields,
  selectedTools: ToolSelection
): boolean => {
  return toolMatchSelection(tool, selectedTools);
};

/**
 * Toggle selection for a specific tool.
 */
export const toggleToolSelection = (
  toolId: string,
  allAvailableTools: ToolSelectionRelevantFields[],
  selectedTools: ToolSelection
): ToolSelection => {
  const currentTool: ToolSelectionRelevantFields = {
    id: toolId,
  };

  const isCurrentlySelected = isToolSelected(currentTool, selectedTools);
  const currentToolIds = [...selectedTools.tool_ids];

  if (isCurrentlySelected) {
    // Check if this tool is selected via wildcard
    const hasWildcardSelection = currentToolIds.includes(allToolsSelectionWildcard);

    if (hasWildcardSelection) {
      // Replace wildcard with individual tool selections (excluding the one being toggled off)
      const otherToolIds = allAvailableTools
        .filter((tool) => tool.id !== toolId)
        .map((tool) => tool.id);

      return {
        tool_ids: otherToolIds,
      };
    } else {
      // Remove from individual selections
      const newToolIds = currentToolIds.filter((id) => id !== toolId);
      return {
        tool_ids: newToolIds,
      };
    }
  } else {
    // Add the tool to selection if not already present
    if (!currentToolIds.includes(toolId)) {
      return {
        tool_ids: [...currentToolIds, toolId],
      };
    }
    return selectedTools;
  }
};
