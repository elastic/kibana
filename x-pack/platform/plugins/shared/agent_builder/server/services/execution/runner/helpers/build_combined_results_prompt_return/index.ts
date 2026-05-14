/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common';
import { createErrorResult, type RunToolReturn } from '@kbn/agent-builder-server';
import type { ToolHandlerResultsWithPromptReturn } from '@kbn/agent-builder-server/tools';

export const buildCombinedResultsPromptReturn = ({
  getToolResultId,
  isStandaloneExecution,
  reportToolCallTelemetry,
  toolReturn,
}: {
  getToolResultId: () => string;
  isStandaloneExecution: boolean;
  reportToolCallTelemetry?: (results: ToolResult[]) => void;
  toolReturn: ToolHandlerResultsWithPromptReturn;
}): RunToolReturn => {
  if (isStandaloneExecution) {
    return {
      results: [
        createErrorResult(
          'Agent running in non-interactive mode, user input not available - execution was declined'
        ),
      ],
    };
  }

  const resultsWithIds = toolReturn.results.map<ToolResult>(
    (result) =>
      ({
        ...result,
        tool_result_id: result.tool_result_id ?? getToolResultId(),
      } as ToolResult)
  );

  reportToolCallTelemetry?.(resultsWithIds);

  return { prompt: toolReturn.prompt, results: resultsWithIds };
};
