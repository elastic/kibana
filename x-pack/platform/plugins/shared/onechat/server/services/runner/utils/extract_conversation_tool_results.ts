/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolResult } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';

export const extractConversationToolResults = (conversation: ConversationRound[]): ToolResult[] => {
  const results: ToolResult[] = [];
  for (const round of conversation) {
    const toolCalls = round.steps.filter(isToolCallStep).flatMap((toolCall) => toolCall.results);
    results.push(...toolCalls);
  }
  return results;
};
