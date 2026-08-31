/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common';
import { createOtherResult } from '@kbn/agent-builder-server';
import { truncateBytes } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';

/**
 * Hard ceiling on the total serialized byte size of a single tool call's result set.
 * Above this, the result is truncated to protect storage/memory: it would otherwise be
 * persisted in full into the conversation and execution documents. This is a fixed
 * infrastructure limit and is deliberately NOT per-tool tunable.
 */
export const MAX_TOOL_RESULT_BYTES = 2 * 1024 * 1024;

/**
 * Returns `results` unchanged when their combined serialized size is within the limit;
 * otherwise returns a single `other` result carrying a truncation notice and the first
 * `MAX_TOOL_RESULT_BYTES` of the serialized results. Pure function.
 */
export const enforceResultSizeLimit = (results: ToolResult[]): ToolResult[] => {
  const stringified = JSON.stringify({ results });
  const bytes = Buffer.byteLength(stringified, 'utf8');
  if (bytes <= MAX_TOOL_RESULT_BYTES) {
    return results;
  }
  const observedMb = (bytes / (1024 * 1024)).toFixed(1);
  const limitMb = MAX_TOOL_RESULT_BYTES / (1024 * 1024);
  const preview = truncateBytes(stringified, MAX_TOOL_RESULT_BYTES);
  const content = `[Tool result truncated: original size ~${observedMb} MB exceeded the ${limitMb} MB storage limit; showing the first ${limitMb} MB.]\n${preview}`;
  return [createOtherResult({ content })];
};
