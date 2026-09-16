/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from './definition';

export type ToolSelectionRelevantFields = Pick<ToolDefinition, 'id'>;

/**
 * "all tools" wildcard which can be used for tool selection
 */
export const allToolsSelectionWildcard = '*';

/**
 * Constant tool selection to select all tools
 */
export const allToolsSelection: ToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];

/**
 * Represents a tool selection based on individual tool IDs
 *
 * The '*' wildcard can be used for ID selection, to inform that all tools should be selected.
 *
 * @example
 * ```ts
 * // select all available tools
 * const allTools: ByIdsToolSelection = { tool_ids: ['*'] }
 *
 * // select toolA and toolB
 * const toolAB: ByIdsToolSelection = { tool_ids: ['toolA', 'toolB'] }
 * ```
 */
export interface ByIdsToolSelection {
  /**
   * List of individual tool ids to select.
   */
  tool_ids: string[];
}

/**
 * Represents a *subtractive* tool selection: tools whose ids are listed here are
 * removed from the resolved tool set, even if an include selection (or the
 * `defaultAgentToolIds` set bound via `enable_elastic_capabilities`) would
 * otherwise select them.
 *
 * This is the mechanism that lets a loaded skill *shadow* a competing
 * general-purpose builtin so the model prefers the skill's dedicated tool.
 * See RFC (security-team#18054). The subtract pass always runs after the
 * include union, so exclusion wins over inclusion.
 *
 * @example
 * ```ts
 * // select everything except the general-purpose document fetch
 * const sel: ToolSelection[] = [
 *   { tool_ids: ['*'] },
 *   { exclude_tool_ids: ['platform.core.get_document_by_id'] },
 * ]
 * ```
 */
export interface ExcludeToolSelection {
  /**
   * List of individual tool ids to exclude from the resolved selection.
   */
  exclude_tool_ids: string[];
}

/**
 * All possible subtypes for a *persisted / user-facing* tool selection.
 *
 * NOTE: this intentionally remains by-ids-only. Agent configuration, the UI, telemetry and
 * persistence all deal exclusively in include-selections, so they are unaffected by the
 * subtractive mechanism. The subtractive variant ({@link ExcludeToolSelection}) is an
 * internal framework construct — see {@link ResolvableToolSelection}.
 */
export type ToolSelection = ByIdsToolSelection;

/**
 * The union of selection shapes the runtime tool *resolver* understands. This is an internal
 * construct — it is never persisted, never part of an agent's configuration, and never surfaced
 * in the UI or telemetry. It exists only so `filterToolsBySelection` can apply a subtract pass
 * for loaded skills that shadow a competing builtin (RFC security-team#18054).
 */
export type ResolvableToolSelection = ByIdsToolSelection | ExcludeToolSelection;

/**
 * Check if a given selection is a {@link ByIdsToolSelection}
 */
export const isByIdsToolSelection = (
  toolSelection: ResolvableToolSelection
): toolSelection is ByIdsToolSelection => {
  return (
    'tool_ids' in toolSelection && Array.isArray((toolSelection as ByIdsToolSelection).tool_ids)
  );
};

/**
 * Check if a given selection is an {@link ExcludeToolSelection}
 */
export const isExcludeToolSelection = (
  toolSelection: ResolvableToolSelection
): toolSelection is ExcludeToolSelection => {
  return (
    'exclude_tool_ids' in toolSelection &&
    Array.isArray((toolSelection as ExcludeToolSelection).exclude_tool_ids)
  );
};

/**
 * Returns all tools matching at least one of the provided include selections,
 * with any tools listed in an exclude selection removed afterwards.
 *
 * Resolution is two-phase and exclusion-wins:
 *   1. include union — a tool is kept if it matches any {@link ByIdsToolSelection}
 *   2. subtract pass — a tool is dropped if its id is in any {@link ExcludeToolSelection}
 *
 * When no exclude selection is present, behaviour is identical to the prior
 * include-only union (backwards compatible). Accepts the internal
 * {@link ResolvableToolSelection}; a plain {@link ToolSelection}[] (by-ids only) is a valid
 * subset and continues to work unchanged.
 */
export const filterToolsBySelection = <TType extends ToolSelectionRelevantFields>(
  tools: TType[],
  toolSelection: ResolvableToolSelection[]
): TType[] => {
  const includeSelections = toolSelection.filter(isByIdsToolSelection);
  const excludedToolIds = new Set(
    toolSelection.filter(isExcludeToolSelection).flatMap((selection) => selection.exclude_tool_ids)
  );

  return tools.filter(
    (tool) =>
      includeSelections.some((selection) => toolMatchSelection(tool, selection)) &&
      !excludedToolIds.has(tool.id)
  );
};

/**
 * Returns true if the given tool descriptor matches the provided include tool selection.
 */
export const toolMatchSelection = (
  tool: ToolSelectionRelevantFields,
  toolSelection: ByIdsToolSelection
): boolean => {
  if (toolSelection.tool_ids.includes(allToolsSelectionWildcard)) {
    return true;
  }
  return toolSelection.tool_ids.includes(tool.id);
};
