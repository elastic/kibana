/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, isToolMessage } from '@langchain/core/messages';
import { extractTextContent } from '@kbn/onechat-genai-utils/langchain';

interface ToolResult {
  toolCallId: string;
  result: string;
}

export const extractToolResults = (messages: BaseMessage[]): ToolResult[] => {
  const results: ToolResult[] = [];
  for (const message of messages) {
    if (isToolMessage(message)) {
      results.push({
        toolCallId: message.tool_call_id,
        result: extractTextContent(message),
      });
    }
  }
  return results;
};
