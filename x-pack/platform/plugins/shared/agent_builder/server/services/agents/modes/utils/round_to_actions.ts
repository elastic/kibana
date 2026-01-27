/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ProcessedConversationRound } from './prepare_conversation';
import type { ResearchAgentAction } from '../default/actions';
import { toolCallAction, executeToolAction } from '../default/actions';

export const roundToActions = ({
  round,
  toolIdMapping,
}: {
  round: ConversationRound | ProcessedConversationRound;
  toolIdMapping: ToolIdMapping;
}): ResearchAgentAction[] => {
  const actions: ResearchAgentAction[] = [];

  const toolCalls = round.steps.filter(isToolCallStep);
  toolCalls.forEach((toolCall, index) => {
    const toolName = toolIdMapping.get(toolCall.tool_id) ?? toolCall.tool_id;
    actions.push(
      toolCallAction([
        {
          toolName,
          toolCallId: toolCall.tool_call_id,
          args: toolCall.params,
        },
      ])
    );
    // interrupted tool call won't have results
    if (index < toolCalls.length - 1 || toolCall.results.length) {
      actions.push(
        executeToolAction([
          {
            toolCallId: toolCall.tool_call_id,
            content: JSON.stringify({ results: toolCall.results }),
            artifact: { results: toolCall.results },
          },
        ])
      );
    }
  });

  return actions;
};
