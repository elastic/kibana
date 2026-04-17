/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolReturnSummarizerFn } from '@kbn/agent-builder-server/tools';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';

/**
 * Shared summarizer for all filestore tools.
 * Replaces each tool result with a placeholder indicating the data was removed,
 * preserving the original tool_result_id for traceability.
 */
export const summarizeFilestoreToolReturn: ToolReturnSummarizerFn = (toolReturn) => {
  const toolName = sanitizeToolId(toolReturn.tool_id);
  return toolReturn.results.map((result) => ({
    tool_result_id: result.tool_result_id,
    type: ToolResultType.other,
    data: {
      comment: `Filestore tool result removed from the conversation. To retrieve this data, call the "${toolName}" tool with the parameters below.`,
      recall_tool: toolName,
      recall_parameters: toolReturn.params,
    },
  }));
};
