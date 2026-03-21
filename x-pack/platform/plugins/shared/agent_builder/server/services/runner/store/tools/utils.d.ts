import type { ToolReturnSummarizerFn } from '@kbn/agent-builder-server/tools';
/**
 * Shared summarizer for all filestore tools.
 * Replaces each tool result with a placeholder indicating the data was removed,
 * preserving the original tool_result_id for traceability.
 */
export declare const summarizeFilestoreToolReturn: ToolReturnSummarizerFn;
