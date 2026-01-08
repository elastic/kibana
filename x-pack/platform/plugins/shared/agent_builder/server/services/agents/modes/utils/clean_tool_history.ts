/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundStep,
  ToolResult,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { CleanedHistoryResult } from '@kbn/agent-builder-server';
import type { ToolRegistry } from '../../../tools';

/**
 * Marker to identify cleaned tool results.
 * Prevents double-cleaning if history is processed multiple times.
 */
const CLEANED_MARKER = '__cleaned__';

/**
 * Checks if a result has already been cleaned.
 */
export const isCleanedResult = (data: unknown): boolean => {
  return (
    typeof data === 'object' &&
    data !== null &&
    CLEANED_MARKER in data &&
    (data as Record<string, unknown>)[CLEANED_MARKER] === true
  );
};

/**
 * Creates the cleaned data structure from a CleanedHistoryResult.
 */
const createCleanedData = (cleanedResult: CleanedHistoryResult): Record<string, unknown> => ({
  [CLEANED_MARKER]: true,
  summary: cleanedResult.summary,
  ...cleanedResult.metadata,
});

/**
 * Cleans a single tool result using the tool's cleanHistory function.
 */
const cleanToolResult = async (
  toolId: string,
  result: ToolResult,
  toolRegistry: ToolRegistry
): Promise<ToolResult> => {
  // Check if this result has already been cleaned
  if ('data' in result && isCleanedResult(result.data)) {
    return result;
  }

  try {
    const tool = await toolRegistry.get(toolId);
    if (!tool?.cleanHistory) {
      return result;
    }

    const cleanedResult = tool.cleanHistory(result);
    if (!cleanedResult) {
      return result;
    }

    return {
      ...result,
      data: createCleanedData(cleanedResult),
    } as ToolResult;
  } catch {
    return result;
  }
};

/**
 * Cleans a conversation step using tool cleaners from the registry.
 */
const cleanStep = async (
  step: ConversationRoundStep,
  toolRegistry: ToolRegistry
): Promise<ConversationRoundStep> => {
  if (!isToolCallStep(step)) {
    return step;
  }

  const cleanedResults = await Promise.all(
    step.results.map((result) => cleanToolResult(step.tool_id, result, toolRegistry))
  );

  return {
    ...step,
    results: cleanedResults,
  };
};

/**
 * Cleans tool results in conversation history using tool cleaners from the registry.
 * Replaces large tool results with compact summaries to prevent context bloat.
 *
 * Tools can provide a `cleanHistory` function to define how their results should be cleaned.
 * This is crucial for long conversations - without cleaning, large tool results
 * would be repeated in history, quickly exhausting the LLM's context window.
 *
 * @param rounds - The conversation rounds to clean
 * @param toolRegistry - The tool registry to look up tools and their cleanHistory functions
 * @returns Cleaned conversation rounds
 */
export const cleanToolCallHistory = async (
  rounds: ConversationRound[],
  toolRegistry: ToolRegistry
): Promise<ConversationRound[]> => {
  return Promise.all(
    rounds.map(async (round) => ({
      ...round,
      steps: await Promise.all(round.steps.map((step) => cleanStep(step, toolRegistry))),
    }))
  );
};

/**
 * Estimates the token savings from cleaning rounds.
 * Useful for logging/monitoring context optimization effectiveness.
 */
export const estimateCleaningSavings = (
  originalRounds: ConversationRound[],
  cleanedRounds: ConversationRound[]
): { originalTokens: number; cleanedTokens: number; savedTokens: number } => {
  const estimateTokens = (data: unknown): number => {
    const str = JSON.stringify(data);
    return Math.ceil(str.length / 4); // Rough estimate: ~4 chars per token
  };

  let originalTokens = 0;
  let cleanedTokens = 0;

  for (let i = 0; i < originalRounds.length; i++) {
    originalTokens += estimateTokens(originalRounds[i]);
    cleanedTokens += estimateTokens(cleanedRounds[i]);
  }

  return {
    originalTokens,
    cleanedTokens,
    savedTokens: originalTokens - cleanedTokens,
  };
};
