/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { getToolCallEntryPath } from '../../../runner/store/volumes/tool_results/utils';

/**
 * Token threshold for file reference substitution.
 * Tool results exceeding this threshold will be replaced with a file reference.
 */
export const FILE_REFERENCE_TOKEN_THRESHOLD = 500;

/**
 * Marker to identify cleaned/transformed tool results.
 * Prevents double-processing if results are transformed multiple times.
 */
const SUMMARY_MARKER = '_summary';

/**
 * Checks if a result has already been summarized/transformed.
 */
const isSummaryResult = (data: unknown): boolean => {
  return (
    typeof data === 'object' &&
    data !== null &&
    SUMMARY_MARKER in data &&
    (data as Record<string, unknown>)[SUMMARY_MARKER] === true
  );
};

/**
 * Checks if all results in a tool call have already been cleaned.
 */
const areAllResultsCleaned = (results: ToolResult[]): boolean => {
  return results.every((result) => {
    if ('data' in result) {
      return isSummaryResult(result.data);
    }
    return false;
  });
};

/**
 * Marks a result as cleaned by adding the cleaned marker to its data.
 */
const markResultAsCleaned = (result: ToolResult): ToolResult => {
  if ('data' in result && typeof result.data === 'object' && result.data !== null) {
    const data = result.data as Record<string, unknown>;
    if (!isSummaryResult(data)) {
      return {
        ...result,
        data: {
          ...data,
          [SUMMARY_MARKER]: true,
        },
      } as ToolResult;
    }
  }
  return result;
};

/**
 * Function type for transforming all results from a tool call.
 * Works at the tool-call level to allow aggregation/summarization across results.
 */
export type ToolCallResultTransformer = (toolCall: ToolCallWithResult) => Promise<ToolResult[]>;

export interface CreateResultTransformerOptions {
  /**
   * Tool registry to look up tool-specific summarization functions.
   */
  toolRegistry: ToolRegistry;
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
export const createResultTransformer = ({
  toolRegistry,
  filestore,
  filestoreEnabled,
  tokenThreshold = FILE_REFERENCE_TOKEN_THRESHOLD,
}: CreateResultTransformerOptions): ToolCallResultTransformer => {
  return async (toolCall: ToolCallWithResult): Promise<ToolResult[]> => {
    // Skip if no results or all already cleaned
    if (toolCall.results.length === 0 || areAllResultsCleaned(toolCall.results)) {
      return toolCall.results;
    }

    // Step 1: Try tool-specific summarization
    const summarized = await tryToolSummarization(toolCall, toolRegistry);
    if (summarized) {
      return summarized.map(markResultAsCleaned);
    }

    // Step 2: Apply file reference substitution if enabled
    if (filestoreEnabled) {
      const transformed = await Promise.all(
        toolCall.results.map((result) =>
          tryFilestoreSubstitution({
            result,
            toolId: toolCall.tool_id,
            toolCallId: toolCall.tool_call_id,
            filestore,
            threshold: tokenThreshold,
          })
        )
      );
      return transformed;
    }

    // No transformation applied
    return toolCall.results;
  };
};

/**
 * Attempts to apply tool-specific summarization using the tool's `summarizeToolReturn` function.
 * Returns the summarized results, or undefined if no summarization is available/applicable.
 */
const tryToolSummarization = async (
  toolCall: ToolCallWithResult,
  toolRegistry: ToolRegistry
): Promise<ToolResult[] | undefined> => {
  try {
    const tool = await toolRegistry.get(toolCall.tool_id);
    if (!tool?.summarizeToolReturn) {
      return undefined;
    }

    const summarizedResults = tool.summarizeToolReturn(toolCall);
    return summarizedResults ?? undefined;
  } catch {
    // Tool not found or error - skip summarization
    return undefined;
  }
};

/**
 * Attempts to substitute a tool result with a file reference if it exceeds the token threshold.
 * Returns the file reference result if substituted, or the original result.
 */
const tryFilestoreSubstitution = async ({
  result,
  toolId,
  toolCallId,
  filestore,
  threshold,
}: {
  result: ToolResult;
  toolId: string;
  toolCallId: string;
  filestore: IFileStore;
  threshold: number;
}): Promise<ToolResult> => {
  // Skip if already cleaned
  if ('data' in result && isSummaryResult(result.data)) {
    return result;
  }

  const path = getToolCallEntryPath({
    toolId,
    toolCallId,
    toolResultId: result.tool_result_id,
  });

  try {
    const entry = await filestore.read(path);

    // If entry exists and exceeds threshold, substitute with file reference
    if (entry && entry.metadata.token_count > threshold) {
      return markResultAsCleaned({
        tool_result_id: result.tool_result_id,
        type: ToolResultType.fileReference,
        data: {
          filepath: path,
          comment:
            'The result has been stored on the filestore. You can access it using the filestore_read tool with the specified filepath',
        },
      });
    }
  } catch {
    // Error reading from filestore - keep original
  }

  return result;
};
