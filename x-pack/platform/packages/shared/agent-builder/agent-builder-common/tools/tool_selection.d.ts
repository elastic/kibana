import type { ToolDefinition } from './definition';
export type ToolSelectionRelevantFields = Pick<ToolDefinition, 'id'>;
/**
 * "all tools" wildcard which can be used for tool selection
 */
export declare const allToolsSelectionWildcard = "*";
/**
 * Constant tool selection to select all tools
 */
export declare const allToolsSelection: ToolSelection[];
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
 * All possible subtypes for tool selection - for now there is only one.
 */
export type ToolSelection = ByIdsToolSelection;
/**
 * Check if a given {@link ToolSelection} is a {@link ByIdsToolSelection}
 */
export declare const isByIdsToolSelection: (toolSelection: ToolSelection) => toolSelection is ByIdsToolSelection;
/**
 * Returns all tools matching at least one of the provided tool selections.
 */
export declare const filterToolsBySelection: <TType extends ToolSelectionRelevantFields>(tools: TType[], toolSelection: ToolSelection[]) => TType[];
/**
 * Returns true if the given tool descriptor matches the provided tool selection.
 */
export declare const toolMatchSelection: (tool: ToolSelectionRelevantFields, toolSelection: ToolSelection) => boolean;
