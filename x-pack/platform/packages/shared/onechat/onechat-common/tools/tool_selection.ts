/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProviderId, PlainIdToolIdentifier, ToolDescriptor } from './tools';

/**
 * "all tools" wildcard which can be used for {@link ByIdsToolSelection}
 */
export const allToolsSelectionWildcard = '*';
/**
 * Constant tool selection to select all tools
 */
export const allToolsSelection: ToolSelection[] = [{ toolIds: [allToolsSelectionWildcard] }];

/**
 * Represents a tool selection based on individual tool IDs, and optionally a provider ID.
 *
 * The '*' wildcard can be used for ID selection, to inform that all tools should be selected.
 *
 * @example
 * ```ts
 * // select all available tools
 * const allTools: ByIdsToolSelection = { toolIds: ['*'] }
 *
 * // select all tools from provider "dolly"
 * const allTools: ByIdsToolSelection = { provider: 'dolly', toolIds: ['*'] }
 *
 * // select toolA and toolB, regardless of the provider
 * const toolAB: ByIdsToolSelection = { toolIds: ['toolA', 'toolB'] }
 *
 * // select foo from provider 'custom'
 * const toolAB: ByIdsToolSelection = { provider: 'custom', toolIds: ['foo'] }
 * ```
 */
export interface ByIdsToolSelection {
  /**
   * The id of the provider to select tools from
   */
  provider?: ToolProviderId;
  /**
   * List of individual tool ids to select.
   */
  toolIds: PlainIdToolIdentifier[];
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
  return 'toolIds' in toolSelection && Array.isArray(toolSelection.toolIds);
};

/**
 * Returns all tools matching ay least one of the provided tool selection.
 */
export const filterToolsBySelection = <TType extends ToolDescriptor>(
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
export const toolMatchSelection = (tool: ToolDescriptor, toolSelection: ToolSelection): boolean => {
  if (isByIdsToolSelection(toolSelection)) {
    if (toolSelection.provider && toolSelection.provider !== tool.meta.providerId) {
      return false;
    }
    if (toolSelection.toolIds.includes(allToolsSelectionWildcard)) {
      return true;
    }
    return toolSelection.toolIds.includes(tool.id);
  }
  throw new Error(`Invalid tool selection : ${JSON.stringify(toolSelection)}`);
};
