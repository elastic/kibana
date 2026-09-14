/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExcludedFromFilestore } from '@kbn/agent-builder-common/tools';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { BuildToolContentParams } from '@kbn/agent-builder-genai-utils/langchain';
import {
  estimateTokens,
  truncateTokens,
} from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import {
  getResultFileName,
  getToolCallDirPath,
  getToolCallEntryAbsolutePath,
} from '../../runner/store/volumes/tool_results/utils';

/**
 * Default per-tool-call token budget, used when no explicit value has been
 * configured on the ToolManager and the tool defines no `maxResultTokens` override.
 */
export const DEFAULT_MAX_TOOL_RESULT_TOKENS = 20_000;

/**
 * Builds the LLM-facing `content` string for a tool call's results, applying a hard
 * token-count safeguard. When the combined, stringified results exceed `maxTokens`,
 * they are merged into a single `other` result containing a truncated preview and a
 * pointer to the full, untruncated data (already stored separately by `resultStore`).
 *
 * `maxTokens` is a required param, not read from a module-level constant — this
 * function is budget-agnostic on purpose so a future context-window-derived value
 * needs no signature change here.
 */
export const buildGuardedToolContent = ({
  results,
  toolId,
  toolCallId,
  maxTokens,
}: BuildToolContentParams & { maxTokens: number }): string => {
  const stringified = JSON.stringify({ results });

  const totalTokens = estimateTokens(stringified);
  if (totalTokens <= maxTokens) {
    return stringified;
  }

  const preview = truncateTokens(stringified, maxTokens);
  const recovery = getRecoveryInstructions({ toolId, toolCallId, resultCount: results.length });
  const message = `Output too large (~${totalTokens} tokens). ${recovery}\nPreview (first ${maxTokens} tokens):\n${preview}`;

  return JSON.stringify({ results: [createOtherResult({ content: message })] });
};

const getRecoveryInstructions = ({
  toolId,
  toolCallId,
  resultCount,
}: {
  toolId: string;
  toolCallId: string;
  resultCount: number;
}): string => {
  if (isExcludedFromFilestore(toolId)) {
    return 'The full result is not recoverable.';
  }

  const dirPath = getToolCallDirPath({ toolId, toolCallId });

  if (resultCount === 1) {
    const filePath = getToolCallEntryAbsolutePath(`${dirPath}/${getResultFileName(0, 1)}`);
    return `The full, untruncated result was saved to the virtual filesystem at ${filePath} — use the \`read_file\` tool on that path to access it.`;
  }

  return `The full, untruncated results were saved to the virtual filesystem under ${getToolCallEntryAbsolutePath(
    dirPath
  )} — use the \`list_files\` tool on that directory and \`read_file\` on the result file(s) to recover it.`;
};
