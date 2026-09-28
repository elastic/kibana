/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';

export const otherResult = (data: Record<string, unknown>): ToolHandlerStandardReturn => ({
  results: [{ type: ToolResultType.other, tool_result_id: getToolResultId(), data }],
});

export const errorResult = (
  message: string,
  metadata?: Record<string, unknown>
): ToolHandlerStandardReturn => ({
  results: [
    {
      type: ToolResultType.error,
      tool_result_id: getToolResultId(),
      data: { message, ...(metadata ? { metadata } : {}) },
    },
  ],
});

/** Normalizes an unknown thrown value into a friendly error result. */
export const toErrorResult = (
  error: unknown,
  genericPrefix: string,
  metadata?: Record<string, unknown>
): ToolHandlerStandardReturn => {
  const message = error instanceof Error ? error.message : String(error);
  return errorResult(`${genericPrefix}: ${message}`, metadata);
};
