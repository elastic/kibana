/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
import type { ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolResultStore } from '@kbn/agent-builder-server/runner';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner/tool_manager';
import {
  getToolCallEntryPath,
  getToolCallEntryAbsolutePath,
} from '../../runner/store/volumes/tool_results/utils';
import type { ToolCallResultTransformer } from './tool_summarization';
import {
  areAllResultsCleaned,
  isSummaryResult,
  markResultAsCleaned,
  tryToolSummarization,
} from './tool_summarization';
=======
import type { ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner/tool_manager';
import { getToolCallEntryPath } from '../../runner/store/volumes/tool_results/utils';
import type { ProcessedConversation } from './prepare_conversation';
>>>>>>> 9.4

/**
 * Conversation token threshold for file reference substitution.
 * Filestore substitution will only be enabled if the token count from previous rounds exceeds this threshold.
 */
export const FS_CONTEXT_TOKEN_THRESHOLD = 50_000;

/**
 * Per tool-result token threshold for file reference substitution.
 * Only tool results exceeding this threshold will be substituted with file references.
 */
export const FS_TOOL_CALL_TOKEN_THRESHOLD = 1_000;

<<<<<<< HEAD
export interface CreateResultTransformerOptions {
  /**
=======
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
   * Conversation processed for the round.
   */
  processedConversation: ProcessedConversation;
  /**
>>>>>>> 9.4
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
<<<<<<< HEAD
   * Tool-result store used to look up per-result entry metadata when deciding whether
   * to substitute an oversize result with a file reference.
   */
  resultStore: ToolResultStore;
  /**
   * Unified, summarization-aware conversation token estimate. Gates filestore
   * substitution and is computed once per turn so it matches the compaction trigger.
   */
  conversationTokenEstimate: number;
  /**
   * Token count threshold above which results are substituted with file references.
   * Defaults to FS_TOOL_CALL_TOKEN_THRESHOLD.
   */
  toolCallTokenThreshold?: number;
  /**
   * Conversation token threshold above which filestore substitution is enabled.
   * Defaults to FS_CONTEXT_TOKEN_THRESHOLD.
=======
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
  toolCallTokenThreshold?: number;
  /**
   * Token count threshold above which results are substituted with file references.
   * Defaults to CONVERSATION_TOKEN_THRESHOLD.
>>>>>>> 9.4
   */
  conversationTokenThreshold?: number;
}

<<<<<<< HEAD
=======
const estimateConversationTokens = (conversation: ProcessedConversation): number => {
  return estimateTokens(
    JSON.stringify(
      conversation.previousRounds.map((round) => {
        return { input: round.input, response: round.response, steps: round.steps };
      })
    )
  );
};

>>>>>>> 9.4
/**
 * Creates a unified result transformer that:
 * 1. Applies tool-specific summarization (via `summarizeToolReturn`) if defined
 * 2. For results not summarized, applies file reference substitution if enabled and above threshold
 *
<<<<<<< HEAD
 * Step 2 is gated on the conversation token estimate, but callers (e.g. intra-round
 * compaction) can force it on per call via `forceFilestoreSubstitution`.
 */
export const createResultTransformer = ({
  toolRegistry,
  toolManager,
  resultStore,
  conversationTokenEstimate,
  toolCallTokenThreshold = FS_TOOL_CALL_TOKEN_THRESHOLD,
  conversationTokenThreshold = FS_CONTEXT_TOKEN_THRESHOLD,
}: CreateResultTransformerOptions): ToolCallResultTransformer => {
  const filestoreSubstitutionEnabled = conversationTokenEstimate > conversationTokenThreshold;

  return async (toolCall, options) => {
=======
 * This consolidates the two previous mechanisms (cleanToolCallHistory and createFilestoreResultTransformer)
 * into a single transformation pipeline.
 */
export const createResultTransformer = ({
  processedConversation,
  toolRegistry,
  toolManager,
  filestore,
  filestoreEnabled,
  toolCallTokenThreshold = FS_TOOL_CALL_TOKEN_THRESHOLD,
  conversationTokenThreshold = FS_CONTEXT_TOKEN_THRESHOLD,
}: CreateResultTransformerOptions): ToolCallResultTransformer => {
  // check if we should perform filestore substitution based on the current token usage
  const conversationTokenEstimate = estimateConversationTokens(processedConversation);
  const filestoreSubstitutionEnabled = conversationTokenEstimate > conversationTokenThreshold;

  return async (toolCall: ToolCallWithResult): Promise<ToolResult[]> => {
>>>>>>> 9.4
    // Skip if no results or all already cleaned
    if (toolCall.results.length === 0 || areAllResultsCleaned(toolCall.results)) {
      return toolCall.results;
    }

    // Step 1: Try tool-specific summarization
    const summarized = await tryToolSummarization(toolCall, toolManager, toolRegistry);
    if (summarized) {
      return summarized.map(markResultAsCleaned);
    }

<<<<<<< HEAD
    // Step 2: Apply file reference substitution when the conversation is large enough,
    // or when the caller forces it (intra-round compaction, where pressure comes from
    // the in-flight round rather than conversation history).
    const useFilestore =
      filestoreSubstitutionEnabled || options?.forceFilestoreSubstitution === true;
    if (useFilestore) {
      return Promise.all(
=======
    // Step 2: Apply file reference substitution if enabled
    if (filestoreEnabled && filestoreSubstitutionEnabled) {
      const transformed = await Promise.all(
>>>>>>> 9.4
        toolCall.results.map((result) =>
          tryFilestoreSubstitution({
            result,
            toolId: toolCall.tool_id,
            toolCallId: toolCall.tool_call_id,
<<<<<<< HEAD
            resultStore,
=======
            filestore,
>>>>>>> 9.4
            threshold: toolCallTokenThreshold,
          })
        )
      );
<<<<<<< HEAD
=======
      return transformed;
>>>>>>> 9.4
    }

    // No transformation applied
    return toolCall.results;
  };
};

/**
<<<<<<< HEAD
=======
 * Attempts to apply tool-specific summarization using the tool's `summarizeToolReturn` function.
 * Checks the tool manager first (has all active tools including internal ones like filestore tools),
 * then falls back to the tool registry (for evicted dynamic tools from previous rounds).
 * Returns the summarized results, or undefined if no summarization is available/applicable.
 */
const tryToolSummarization = async (
  toolCall: ToolCallWithResult,
  toolManager: ToolManager,
  toolRegistry: ToolRegistry
): Promise<ToolResult[] | undefined> => {
  const managerSummarizer = toolManager.getSummarizer(toolCall.tool_id);
  if (managerSummarizer) {
    const summarizedResults = managerSummarizer(toolCall);
    return summarizedResults ?? undefined;
  }

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
>>>>>>> 9.4
 * Attempts to substitute a tool result with a file reference if it exceeds the token threshold.
 * Returns the file reference result if substituted, or the original result.
 */
const tryFilestoreSubstitution = async ({
  result,
  toolId,
  toolCallId,
<<<<<<< HEAD
  resultStore,
=======
  filestore,
>>>>>>> 9.4
  threshold,
}: {
  result: ToolResult;
  toolId: string;
  toolCallId: string;
<<<<<<< HEAD
  resultStore: ToolResultStore;
=======
  filestore: IFileStore;
>>>>>>> 9.4
  threshold: number;
}): Promise<ToolResult> => {
  // Skip if already cleaned
  if ('data' in result && isSummaryResult(result.data)) {
    return result;
  }

<<<<<<< HEAD
  const lookupArgs = {
    toolId,
    toolCallId,
    toolResultId: result.tool_result_id,
  };
  const relativePath = getToolCallEntryPath(lookupArgs);
  const agentVisiblePath = getToolCallEntryAbsolutePath(lookupArgs);

  try {
    const entry = await resultStore.getEntry(relativePath);
=======
  const path = getToolCallEntryPath({
    toolId,
    toolCallId,
    toolResultId: result.tool_result_id,
  });

  try {
    const entry = await filestore.read(path);
>>>>>>> 9.4

    // If entry exists and exceeds threshold, substitute with file reference
    if (entry && entry.metadata.token_count > threshold) {
      return markResultAsCleaned({
        tool_result_id: result.tool_result_id,
        type: ToolResultType.fileReference,
        data: {
<<<<<<< HEAD
          filepath: agentVisiblePath,
          comment:
            'The result has been stored in the virtual file system. You can access it using the read_file tool with the specified filepath.',
=======
          filepath: path,
          comment:
            'The result has been stored on the filestore. You can access it using the filestore_read tool with the specified filepath',
>>>>>>> 9.4
        },
      });
    }
  } catch {
    // Error reading from filestore - keep original
  }

  return result;
};
