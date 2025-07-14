/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from './definition';

export type ToolSelectionRelevantFields = Pick<ToolDefinition, 'id' | 'type' | 'tags'>;

/**
 * "all tools" wildcard which can be used for {@link ByIdsToolSelection}
 */
export const allToolsSelectionWildcard = '*';
/**
 * Constant tool selection to select all tools
 */
export const allToolsSelection: ToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];

/**
 * Represents a tool selection based on individual tool IDs, and optionally a provider ID.
 *
 * The '*' wildcard can be used for ID selection, to inform that all tools should be selected.
 *
 * @example
 * ```ts
 * // select all available tools
 * const allTools: ByIdsToolSelection = { tool_ids: ['*'] }
 *
 * // select all tools from provider "dolly"
 * const allTools: ByIdsToolSelection = { provider: 'dolly', tool_ids: ['*'] }
 *
 * // select toolA and toolB, regardless of the provider
 * const toolAB: ByIdsToolSelection = { tool_ids: ['toolA', 'toolB'] }
 *
 * // select foo from provider 'custom'
 * const toolAB: ByIdsToolSelection = { provider: 'custom', tool_ids: ['foo'] }
 * ```
 */
export interface ByIdsToolSelection {
  /**
   * The id of the provider to select tools from
   */
  type?: string;
  /**
   * List of individual tool ids to select.
   */
  tool_ids: string[];
}

/**
 * All possible subtypes for tool selection - for now there is only one.
 */
export type ToolSelection = ByIdsToolSelection;

/**
 * Check if a given {@link ToolSelection} is a {@link ByIdsToolSelection}
 */
export const isByIdsToolSelection = (
  toolSelection: ToolSelection
): toolSelection is ByIdsToolSelection => {
  return 'tool_ids' in toolSelection && Array.isArray(toolSelection.tool_ids);
};

/**
 * Returns all tools matching ay least one of the provided tool selection.
 */
export const filterToolsBySelection = <TType extends ToolSelectionRelevantFields>(
  tools: TType[],
  toolSelection: ToolSelection[]
): TType[] => {
  return tools.filter((tool) =>
    toolSelection.some((selection) => toolMatchSelection(tool, selection))
  );
};

/**
 * Returns true if the given tool descriptor matches the provided tool selection.
 */
export const toolMatchSelection = (
  tool: ToolSelectionRelevantFields,
  toolSelection: ToolSelection
): boolean => {
  if (isByIdsToolSelection(toolSelection)) {
    if (toolSelection.type && toolSelection.type !== tool.type) {
      return false;
    }
    if (toolSelection.tool_ids.includes(allToolsSelectionWildcard)) {
      return true;
    }
    return toolSelection.tool_ids.includes(tool.id);
  }
  throw new Error(`Invalid tool selection : ${JSON.stringify(toolSelection)}`);
};
