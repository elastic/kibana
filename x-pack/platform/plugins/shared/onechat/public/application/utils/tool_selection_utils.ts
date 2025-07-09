/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection, ToolDescriptor } from '@kbn/onechat-common';
import {
  allToolsSelectionWildcard,
  toolMatchSelection,
  filterToolsBySelection,
} from '@kbn/onechat-common';

/**
 * Check if a specific tool is selected based on the current tool selections.
 * This uses existing onechat-common utilities for consistent logic.
 */
export const isToolSelected = (tool: ToolDescriptor, selectedTools: ToolSelection[]): boolean => {
  return selectedTools.some((selection) => toolMatchSelection(tool, selection));
};

/**
 * Check if all tools for a provider are selected.
 * This uses existing onechat-common utilities for consistent logic.
 */
export const isAllToolsSelectedForProvider = (
  providerId: string,
  providerTools: ToolDescriptor[],
  selectedTools: ToolSelection[]
): boolean => {
  // Filter provider tools to only those from the specified provider
  const filteredProviderTools = providerTools.filter((tool) => tool.meta.providerId === providerId);

  // Use existing filterToolsBySelection to get all selected tools from this provider
  const selectedProviderTools = filterToolsBySelection(filteredProviderTools, selectedTools);

  // All tools are selected if the count matches
  return (
    selectedProviderTools.length === filteredProviderTools.length &&
    filteredProviderTools.length > 0
  );
};

/**
 * Remove tool selections that affect a specific provider.
 * This is a helper function for filtering selections.
 */
export const filterOutProviderSelections = (
  selectedTools: ToolSelection[],
  providerId: string,
  providerTools: ToolDescriptor[]
): ToolSelection[] => {
  return selectedTools.filter((selection) => {
    // Keep selections that don't affect this provider
    if (selection.provider && selection.provider !== providerId) {
      return true;
    }

    // Remove wildcard selections for this provider
    if (
      selection.toolIds.includes(allToolsSelectionWildcard) &&
      (!selection.provider || selection.provider === providerId)
    ) {
      return false;
    }

    // Remove selections that contain any tools from this provider
    const hasProviderTools = selection.toolIds.some((toolId) =>
      providerTools.some((tool) => tool.id === toolId)
    );

    return !hasProviderTools;
  });
};

/**
 * Toggle selection for all tools of a specific provider.
 */
export const toggleProviderSelection = (
  providerId: string,
  providerTools: ToolDescriptor[],
  selectedTools: ToolSelection[]
): ToolSelection[] => {
  const allSelected = isAllToolsSelectedForProvider(providerId, providerTools, selectedTools);

  // Filter provider tools to only those from the specified provider
  const filteredProviderTools = providerTools.filter((tool) => tool.meta.providerId === providerId);

  if (allSelected) {
    // Remove all tools from this provider using the helper function
    return filterOutProviderSelections(selectedTools, providerId, filteredProviderTools);
  } else {
    // Add all tools from this provider using wildcard
    // First, remove any existing selections that affect this provider
    const cleanedSelection = filterOutProviderSelections(
      selectedTools,
      providerId,
      filteredProviderTools
    );

    const newProviderSelection: ToolSelection = {
      provider: providerId,
      toolIds: [allToolsSelectionWildcard],
    };

    return [...cleanedSelection, newProviderSelection];
  }
};

/**
 * Toggle selection for a specific tool.
 */
export const toggleToolSelection = (
  toolId: string,
  providerId: string,
  providerTools: ToolDescriptor[],
  selectedTools: ToolSelection[]
): ToolSelection[] => {
  // Create tool descriptor for the current tool
  const currentTool: ToolDescriptor = {
    id: toolId,
    meta: { providerId },
  } as ToolDescriptor;

  const isCurrentlySelected = isToolSelected(currentTool, selectedTools);

  if (isCurrentlySelected) {
    // Check if this tool is selected via wildcard
    const hasWildcardSelection = selectedTools.some(
      (selection) =>
        selection.toolIds.includes(allToolsSelectionWildcard) &&
        (!selection.provider || selection.provider === providerId)
    );

    if (hasWildcardSelection) {
      // Replace wildcard with individual tool selections (excluding the one being toggled off)
      const newSelection = selectedTools.filter(
        (selection) =>
          !(
            selection.toolIds.includes(allToolsSelectionWildcard) &&
            (!selection.provider || selection.provider === providerId)
          )
      );

      // Add individual selections for all other tools from this provider
      const filteredProviderTools = providerTools.filter(
        (tool) => tool.meta.providerId === providerId
      );
      const otherToolIds = filteredProviderTools
        .filter((tool) => tool.id !== toolId)
        .map((tool) => tool.id);

      if (otherToolIds.length > 0) {
        newSelection.push({
          provider: providerId,
          toolIds: otherToolIds,
        });
      }

      return newSelection;
    } else {
      // Remove from individual selections
      return selectedTools
        .map((selection) => {
          if (selection.toolIds.includes(toolId)) {
            const newToolIds = selection.toolIds.filter((id) => id !== toolId);
            return newToolIds.length > 0 ? { ...selection, toolIds: newToolIds } : null;
          }
          return selection;
        })
        .filter(Boolean) as ToolSelection[];
    }
  } else {
    // Add the tool to selection - remove any existing selections for this tool first
    const existingSelection = selectedTools.filter(
      (selection) => !selection.toolIds.includes(toolId)
    );

    const newToolSelection: ToolSelection = {
      toolIds: [toolId],
    };

    return [...existingSelection, newToolSelection];
  }
};
