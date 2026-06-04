/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner';

/**
 * Marker to identify cleaned/transformed tool results.
 * Prevents double-processing if results are transformed multiple times.
 */
const SUMMARY_MARKER = '_summary';

/**
 * Checks if a result has already been summarized/transformed.
 */
export const isSummaryResult = (data: unknown): boolean => {
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
export const areAllResultsCleaned = (results: ToolResult[]): boolean => {
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
export const markResultAsCleaned = (result: ToolResult): ToolResult => {
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

export interface ToolCallResultTransformerOptions {
  // Force filestore substitution regardless of the transformer's construction-time
  // conversation-size gate. Intra-round compaction sets this because the pressure
  // comes from the in-flight round, not from the (possibly empty) conversation history.
  forceFilestoreSubstitution?: boolean;
}

/**
 * Function type for transforming all results from a tool call.
 * Works at the tool-call level to allow aggregation/summarization across results.
 */
export type ToolCallResultTransformer = (
  toolCall: ToolCallWithResult,
  options?: ToolCallResultTransformerOptions
) => Promise<ToolResult[]>;

export interface ToolSummarizationDeps {
  toolManager: ToolManager;
  toolRegistry: ToolRegistry;
}

/**
 * Attempts to apply tool-specific summarization using the tool's `summarizeToolReturn` function.
 * Checks the tool manager first (has all active tools including internal ones like filestore tools),
 * then falls back to the tool registry (for evicted dynamic tools from previous rounds).
 * Returns the summarized results, or undefined if no summarization is available/applicable.
 */
export const tryToolSummarization = async (
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
 * Builds a transformer that applies only tool-specific summarization (Part 1),
 * without filestore substitution. Used for token estimation so the estimate
 * reflects the summarized payload actually sent to the model, not the raw results.
 */
export const createSummarizationTransformer = ({
  toolManager,
  toolRegistry,
}: ToolSummarizationDeps): ToolCallResultTransformer => {
  return async (toolCall) => {
    if (toolCall.results.length === 0 || areAllResultsCleaned(toolCall.results)) {
      return toolCall.results;
    }
    const summarized = await tryToolSummarization(toolCall, toolManager, toolRegistry);
    return summarized ? summarized.map(markResultAsCleaned) : toolCall.results;
  };
};
