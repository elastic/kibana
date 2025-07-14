/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection, ToolType, ToolSelectionRelevantFields } from '@kbn/onechat-common';
import {
  allToolsSelectionWildcard,
  toolMatchSelection,
  filterToolsBySelection,
} from '@kbn/onechat-common';

/**
 * Check if a specific tool is selected based on the current tool selections.
 * This uses existing onechat-common utilities for consistent logic.
 */
export const isToolSelected = (
  tool: ToolSelectionRelevantFields,
  selectedTools: ToolSelection[]
): boolean => {
  return selectedTools.some((selection) => toolMatchSelection(tool, selection));
};

/**
 * Check if all tools for a type are selected.
 * This uses existing onechat-common utilities for consistent logic.
 */
export const isAllToolsSelectedForType = (
  type: string,
  typeTools: ToolSelectionRelevantFields[],
  selectedTools: ToolSelection[]
): boolean => {
  // Filter type tools to only those from the specified ty[e
  const filteredTypeTools = typeTools.filter((tool) => tool.type === type);

  // Use existing filterToolsBySelection to get all selected tools from this type
  const selectedTypeTools = filterToolsBySelection(filteredTypeTools, selectedTools);

  // All tools are selected if the count matches
  return selectedTypeTools.length === filteredTypeTools.length && filteredTypeTools.length > 0;
};

/**
 * Remove tool selections that affect a specific type.
 * This is a helper function for filtering selections.
 */
export const filterOutTypeSelections = (
  selectedTools: ToolSelection[],
  toolType: string,
  typeTools: ToolSelectionRelevantFields[]
): ToolSelection[] => {
  return selectedTools.filter((selection) => {
    // Keep selections that don't affect this type
    if (selection.type && selection.type !== toolType) {
      return true;
    }

    // Remove wildcard selections for this type
    if (
      selection.tool_ids.includes(allToolsSelectionWildcard) &&
      (!selection.type || selection.type === toolType)
    ) {
      return false;
    }

    // Remove selections that contain any tools from this type
    const hasTypeTools = selection.tool_ids.some((toolId) =>
      typeTools.some((tool) => tool.id === toolId)
    );

    return !hasTypeTools;
  });
};

/**
 * Toggle selection for all tools of a specific type.
 */
export const toggleTypeSelection = (
  toolType: string,
  typeTools: ToolSelectionRelevantFields[],
  selectedTools: ToolSelection[]
): ToolSelection[] => {
  const allSelected = isAllToolsSelectedForType(toolType, typeTools, selectedTools);

  // Filter type tools to only those from the specified type
  const filteredTypeTools = typeTools.filter((tool) => tool.type === toolType);

  if (allSelected) {
    // Remove all tools from this type using the helper function
    return filterOutTypeSelections(selectedTools, toolType, filteredTypeTools);
  } else {
    // Add all tools from this type using wildcard
    // First, remove any existing selections that affect this type
    const cleanedSelection = filterOutTypeSelections(selectedTools, toolType, filteredTypeTools);

    const newTypeSelection: ToolSelection = {
      type: toolType,
      tool_ids: [allToolsSelectionWildcard],
    };

    return [...cleanedSelection, newTypeSelection];
  }
};

/**
 * Toggle selection for a specific tool.
 */
export const toggleToolSelection = (
  toolId: string,
  toolType: string,
  typeTools: ToolSelectionRelevantFields[],
  selectedTools: ToolSelection[]
): ToolSelection[] => {
  // Create tool descriptor for the current tool
  const currentTool: ToolSelectionRelevantFields = {
    id: toolId,
    type: toolType as ToolType,
    tags: [],
  };

  const isCurrentlySelected = isToolSelected(currentTool, selectedTools);

  if (isCurrentlySelected) {
    // Check if this tool is selected via wildcard
    const hasWildcardSelection = selectedTools.some(
      (selection) =>
        selection.tool_ids.includes(allToolsSelectionWildcard) &&
        (!selection.type || selection.type === toolType)
    );

    if (hasWildcardSelection) {
      // Replace wildcard with individual tool selections (excluding the one being toggled off)
      const newSelection = selectedTools.filter(
        (selection) =>
          !(
            selection.tool_ids.includes(allToolsSelectionWildcard) &&
            (!selection.type || selection.type === toolType)
          )
      );

      // Add individual selections for all other tools from this type
      const filteredTypeTools = typeTools.filter((tool) => tool.type === toolType);
      const otherToolIds = filteredTypeTools
        .filter((tool) => tool.id !== toolId)
        .map((tool) => tool.id);

      if (otherToolIds.length > 0) {
        newSelection.push({
          type: toolType,
          tool_ids: otherToolIds,
        });
      }

      return newSelection;
    } else {
      // Remove from individual selections
      return selectedTools
        .map((selection) => {
          if (selection.tool_ids.includes(toolId)) {
            const newToolIds = selection.tool_ids.filter((id) => id !== toolId);
            return newToolIds.length > 0 ? { ...selection, tool_ids: newToolIds } : null;
          }
          return selection;
        })
        .filter(Boolean) as ToolSelection[];
    }
  } else {
    // Add the tool to selection - remove any existing selections for this tool first
    const existingSelection = selectedTools.filter(
      (selection) => !selection.tool_ids.includes(toolId)
    );

    const newToolSelection: ToolSelection = {
      tool_ids: [toolId],
    };

    return [...existingSelection, newToolSelection];
  }
};
