import type { ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner/tool_manager';
/**
 * Token threshold for file reference substitution.
 * Tool results exceeding this threshold will be replaced with a file reference.
 */
export declare const FILE_REFERENCE_TOKEN_THRESHOLD = 500;
/**
 * Function type for transforming all results from a tool call.
 * Works at the tool-call level to allow aggregation/summarization across results.
 */
export type ToolCallResultTransformer = (toolCall: ToolCallWithResult) => Promise<ToolResult[]>;
export interface CreateResultTransformerOptions {
    /**
     * Tool registry to look up tool-specific summarization functions.
     * Used as a fallback when the tool is not found in the tool manager
     * (e.g. for evicted dynamic tools from previous rounds).
     */
    toolRegistry: ToolRegistry;
    /**
     * Tool manager to look up tool-specific summarization functions.
     * Checked first, as it contains all active tools including internal ones
     * (filestore tools, attachment tools) that may not be in the registry.
     */
    toolManager: ToolManager;
    /**
     * Filestore to check token counts for file reference substitution.
     */
    filestore: IFileStore;
    /**
     * Whether filestore-based substitution is enabled.
     */
    filestoreEnabled: boolean;
    /**
     * Token count threshold above which results are substituted with file references.
     * Defaults to FILE_REFERENCE_TOKEN_THRESHOLD.
     */
    tokenThreshold?: number;
}
/**
 * Creates a unified result transformer that:
 * 1. Applies tool-specific summarization (via `summarizeToolReturn`) if defined
 * 2. For results not summarized, applies file reference substitution if enabled and above threshold
 *
 * This consolidates the two previous mechanisms (cleanToolCallHistory and createFilestoreResultTransformer)
 * into a single transformation pipeline.
 */
export declare const createResultTransformer: ({ toolRegistry, toolManager, filestore, filestoreEnabled, tokenThreshold, }: CreateResultTransformerOptions) => ToolCallResultTransformer;
