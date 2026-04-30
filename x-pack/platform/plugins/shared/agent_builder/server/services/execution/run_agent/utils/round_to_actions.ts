/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { ConversationRound, ToolCallStep, ReasoningStep } from '@kbn/agent-builder-common';
import { isReasoningStep } from '@kbn/agent-builder-common';
import type { ProcessedConversationRound } from './prepare_conversation';
import type { ResearchAgentAction } from '../actions';
import { toolCallAction, executeToolAction } from '../actions';
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
  const reasoningSteps = round.steps.filter(isReasoningStep);

  for (const group of groups) {
    const { completed, pending } = partitionGroupByCompletion(group);
    const groupId = group[0].tool_call_group_id;
    const groupMessage = getGroupReasoning(reasoningSteps, groupId);

    if (completed.length > 0) {
      actions.push(
        toolCallAction({
          toolCalls: completed.map((step) => ({
            toolName: toolIdMapping.get(step.tool_id) ?? step.tool_id,
            toolCallId: step.tool_call_id,
            args: step.params,
            reasoning: getStepReasoning(reasoningSteps, step.tool_call_id),
          })),
          message: groupMessage,
        })
      );
      actions.push(
        executeToolAction({
          toolResults: completed.map((step) => ({
            toolCallId: step.tool_call_id,
            content: JSON.stringify({ results: step.results }),
            artifact: { results: step.results },
          })),
        })
      );
    }

    if (pending.length > 0) {
      actions.push(
        toolCallAction({
          toolCalls: pending.map((step) => ({
            toolName: toolIdMapping.get(step.tool_id) ?? step.tool_id,
            toolCallId: step.tool_call_id,
            args: step.params,
            reasoning: getStepReasoning(reasoningSteps, step.tool_call_id),
          })),
          message: groupMessage,
        })
      );
    }
  }

  return actions;
};

const getGroupReasoning = (
  reasoningSteps: ReasoningStep[],
  groupId: string | undefined
): string | undefined => {
  if (!groupId) {
    return undefined;
  }
  const text = reasoningSteps
    .filter((s) => s.tool_call_group_id === groupId && !s.tool_call_id)
    .map((s) => s.reasoning)
    .join('\n');
  return text || undefined;
};

const getStepReasoning = (
  reasoningSteps: ReasoningStep[],
  toolCallId: string
): string | undefined => {
  const text = reasoningSteps
    .filter((s) => s.tool_call_id === toolCallId)
    .map((s) => s.reasoning)
    .join('\n');
  return text || undefined;
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
