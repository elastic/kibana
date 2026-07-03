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
import { getToolCallDirPath, getToolCallEntryAbsolutePath } from '../../runner/store/volumes/tool_results/utils';

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

  try {
    const totalTokens = estimateTokens(stringified);
    if (totalTokens <= maxTokens) {
      return stringified;
    }

    const preview = truncateTokens(stringified, maxTokens);
    const message = isExcludedFromFilestore(toolId)
      ? `Output too large (~${totalTokens} tokens) and has been truncated for this response; the full result is not recoverable via the virtual filesystem for this tool.\nPreview (first ${maxTokens} tokens):\n${preview}`
      : `Output too large (~${totalTokens} tokens). The full, untruncated result was saved to the virtual filesystem under ${getToolCallEntryAbsolutePath(
          getToolCallDirPath({ toolId, toolCallId })
        )} — use the \`list_files\` tool on that directory and \`read_file\` on the result file(s) to recover it.\nPreview (first ${maxTokens} tokens):\n${preview}`;

    return JSON.stringify({ results: [createOtherResult({ content: message })] });
  } catch {
    // Fail open: the guardrail must never become a new source of tool-call failures.
    return stringified;
  }
};
