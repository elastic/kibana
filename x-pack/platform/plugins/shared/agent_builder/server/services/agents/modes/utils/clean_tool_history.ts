/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundStep,
  ToolCallWithResult,
  ToolResult,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
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
 * Checks if all results in a tool return have already been cleaned.
 */
const areAllResultsCleaned = (results: ToolResult[]): boolean => {
  return results.every((result) => {
    if ('data' in result) {
      return isCleanedResult(result.data);
    }
    return false;
  });
};

/**
 * Marks a result as cleaned by adding the cleaned marker to its data.
 * The cleaner function should return results with cleaned data (summary, metadata),
 * and we add the marker to prevent double-cleaning.
 */
const markResultAsCleaned = (result: ToolResult): ToolResult => {
  if ('data' in result && typeof result.data === 'object' && result.data !== null) {
    const data = result.data as Record<string, unknown>;
    // Only add marker if it's not already there
    if (!isCleanedResult(data)) {
      return {
        ...result,
        data: {
          ...data,
          [CLEANED_MARKER]: true,
        },
      } as ToolResult;
    }
  }
  return result;
};

/**
 * Summarizes all tool results from a single tool call using the tool's `summarizeToolReturn` function.
 * This allows the summarizer to see all results together and aggregate/summarize them.
 */
const cleanToolResults = async (
  step: ToolCallWithResult,
  toolRegistry: ToolRegistry
): Promise<ToolResult[]> => {
  if (areAllResultsCleaned(step.results)) {
    return step.results;
  }

  if (step.results.length === 0) {
    return step.results;
  }

  try {
    const tool = await toolRegistry.get(step.tool_id);
    if (!tool?.summarizeToolReturn) {
      return step.results;
    }

    const summarizedResults = tool.summarizeToolReturn(step);
    if (!summarizedResults) {
      return step.results;
    }

    return summarizedResults.map(markResultAsCleaned);
  } catch {
    return step.results;
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

  const cleanedResults = await cleanToolResults(step, toolRegistry);

  return {
    ...step,
    results: cleanedResults,
  };
};

/**
 * Cleans tool results in conversation history using tool cleaners from the registry.
 * Replaces large tool results with compact summaries to prevent context bloat.
 *
 * Tools can provide a `summarizeToolReturn` function to define how their results should be summarized.
 * This is crucial for long conversations - without cleaning, large tool results
 * would be repeated in history, quickly exhausting the LLM's context window.
 *
 * @param rounds - The conversation rounds to clean
 * @param toolRegistry - The tool registry to look up tools and their summarizeToolReturn functions
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
