/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunToolReturn } from '@kbn/agent-builder-server';
import { isOtherResult, isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * Result of extracting data from a sub-tool invocation.
 * Either contains the extracted data or an error message.
 */
export type ExtractedResult<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Extracts typed data from a RunToolReturn response.
 *
 * Handles both success (ToolResultType.other) and error (ToolResultType.error) results.
 * Returns a discriminated union so callers can handle both cases without casting.
 */
export const extractToolResult = <T>(
  toolReturn: RunToolReturn,
  toolName: string
): ExtractedResult<T> => {
  const { results } = toolReturn;

  if (!results || results.length === 0) {
    return { success: false, error: `${toolName} returned no results` };
  }

  const result = results[0];

  if (isErrorResult(result)) {
    return { success: false, error: result.data.message };
  }

  if (isOtherResult(result)) {
    return { success: true, data: result.data as T };
  }

  return { success: false, error: `${toolName} returned unexpected result type: ${result.type}` };
};

/**
 * Extracts data from multiple tool results in parallel, returning a record
 * keyed by tool name with either the data or error for each.
 */
export const extractMultipleResults = <T extends Record<string, RunToolReturn>>(
  results: T
): { [K in keyof T]: ExtractedResult<Record<string, unknown>> } => {
  const extracted = {} as { [K in keyof T]: ExtractedResult<Record<string, unknown>> };
  for (const [key, value] of Object.entries(results) as Array<[keyof T, RunToolReturn]>) {
    extracted[key] = extractToolResult<Record<string, unknown>>(value, String(key));
  }
  return extracted;
};
