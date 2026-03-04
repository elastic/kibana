/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';
import type { ProcessedConversationRound } from './prepare_conversation';
import type { ResearchAgentAction } from '../default/actions';
import { toolCallAction, executeToolAction } from '../default/actions';
import { groupToolCallSteps } from './to_langchain_messages';

export const roundToActions = ({
  round,
  toolIdMapping,
}: {
  round: ConversationRound | ProcessedConversationRound;
  toolIdMapping: ToolIdMapping;
}): ResearchAgentAction[] => {
  const actions: ResearchAgentAction[] = [];
  const groups = groupToolCallSteps(round.steps);

  for (const group of groups) {
    const { completed, pending } = partitionGroupByCompletion(group);

    if (completed.length > 0) {
      actions.push(
        toolCallAction(
          completed.map((step) => ({
            toolName: toolIdMapping.get(step.tool_id) ?? step.tool_id,
            toolCallId: step.tool_call_id,
            args: step.params,
          }))
        )
      );
      actions.push(
        executeToolAction(
          completed.map((step) => ({
            toolCallId: step.tool_call_id,
            content: JSON.stringify({ results: step.results }),
            artifact: { results: step.results },
          }))
        )
      );
    }

    if (pending.length > 0) {
      actions.push(
        toolCallAction(
          pending.map((step) => ({
            toolName: toolIdMapping.get(step.tool_id) ?? step.tool_id,
            toolCallId: step.tool_call_id,
            args: step.params,
          }))
        )
      );
    }
  }

  return actions;
};

const partitionGroupByCompletion = (
  group: ToolCallStep[]
): { completed: ToolCallStep[]; pending: ToolCallStep[] } => {
  const completed: ToolCallStep[] = [];
  const pending: ToolCallStep[] = [];
  for (const step of group) {
    if (step.results.length > 0) {
      completed.push(step);
    } else {
      pending.push(step);
    }
  }
  return { completed, pending };
};
