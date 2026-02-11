/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolCallWithResult } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ToolResultWithMeta } from '@kbn/agent-builder-server/runner';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { ToolCallFileEntry } from './types';

export const getToolCallEntryPath = ({
  toolId,
  toolCallId,
  toolResultId,
}: {
  toolId: string;
  toolCallId: string;
  toolResultId: string;
}): string => {
  return `/tool_calls/${sanitizeToolId(toolId)}/${toolCallId}/${toolResultId}.json`;
};

export const createToolCallEntry = (result: ToolResultWithMeta): ToolCallFileEntry => {
  const stringifiedContent = JSON.stringify(result.result.data, undefined, 2);
  return {
    type: 'file',
    path: getToolCallEntryPath({
      toolId: result.tool_id,
      toolCallId: result.tool_call_id,
      toolResultId: result.result.tool_result_id,
    }),
    content: {
      raw: result.result.data,
      plain_text: stringifiedContent,
    },
    metadata: {
      // generic meta
      type: FileEntryType.toolResult,
      id: result.result.tool_result_id,
      token_count: estimateTokens(stringifiedContent),
      readonly: true,
      // specific tool-result meta
      tool_result_type: result.result.type,
      tool_call_id: result.tool_call_id,
      tool_id: result.tool_id,
    },
  };
};

const toolCallToResults = (toolCall: ToolCallWithResult): ToolResultWithMeta[] => {
  return toolCall.results.map((result) => ({
    result,
    tool_call_id: toolCall.tool_call_id,
    tool_id: toolCall.tool_id,
  }));
};

export const extractConversationToolResults = (
  conversation: ConversationRound[]
): ToolResultWithMeta[] => {
  const results: ToolResultWithMeta[] = [];
  for (const round of conversation) {
    const toolCalls = round.steps.filter(isToolCallStep).flatMap(toolCallToResults);
    results.push(...toolCalls);
  }
  return results;
};
