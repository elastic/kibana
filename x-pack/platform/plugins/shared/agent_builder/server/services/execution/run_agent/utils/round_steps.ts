/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BackgroundAgentCompleteEvent,
  BackgroundAgentCompleteStep,
  CompactionStep,
  ConversationRoundStep,
  ReasoningEvent,
  ReasoningStep,
  ToolCallEvent,
  ToolCallStep,
  ToolProgressEvent,
  ToolResultEvent,
} from '@kbn/agent-builder-common';
import { ConversationRoundStepType, createRelevantSkillsStep } from '@kbn/agent-builder-common';
import type { CompactedConversation } from './conversation_compactor';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';

/** Builds a tool-call step from its call/result/progress events. */
export const createToolCallStep = ({
  toolCall,
  toolResult,
  toolProgress,
}: {
  toolCall: ToolCallEvent;
  toolProgress: ToolProgressEvent[];
  toolResult?: ToolResultEvent;
}): ToolCallStep => {
  return {
    type: ConversationRoundStepType.toolCall,
    tool_id: toolCall.data.tool_id,
    params: toolCall.data.params,
    tool_call_id: toolCall.data.tool_call_id,
    progression: toolProgress.map(({ data: { message, metadata } }) => ({
      message,
      metadata,
    })),
    results: toolResult?.data.results ?? [],
    tool_call_group_id: toolCall.data.tool_call_group_id,
    tool_origin: toolCall.data.tool_origin,
    tool_type: toolCall.data.tool_type,
  };
};

/** Builds a reasoning step from a (non-transient) reasoning event. */
export const createReasoningStep = (event: ReasoningEvent): ReasoningStep => {
  return {
    type: ConversationRoundStepType.reasoning,
    reasoning: event.data.reasoning,
    tool_call_id: event.data.tool_call_id,
    tool_call_group_id: event.data.tool_call_group_id,
  };
};

/** Builds a background-agent-complete step from its completion event. */
export const createBackgroundAgentStep = (
  event: BackgroundAgentCompleteEvent
): BackgroundAgentCompleteStep => {
  return {
    type: ConversationRoundStepType.backgroundAgentComplete,
    ...event.data.execution,
  };
};

export const createPreExecutionSteps = ({
  compactionResult,
  relevantSkillsSelection,
}: {
  compactionResult?: CompactedConversation;
  relevantSkillsSelection?: RelevantSkillSelection;
}): ConversationRoundStep[] => {
  const steps: ConversationRoundStep[] = [];

  if (compactionResult?.compactionTriggered && compactionResult.summary) {
    const compactionStep: CompactionStep = {
      type: ConversationRoundStepType.compaction,
      token_count_before: compactionResult.tokensBefore ?? 0,
      token_count_after: compactionResult.tokensAfter ?? 0,
      summarized_round_count: compactionResult.summary.summarized_round_count,
    };
    steps.push(compactionStep);
  }

  // Relevant-skills step is placed before the event-derived steps so, on replay, its notification
  // renders right after the round's user input and before the round's tool calls.
  if (relevantSkillsSelection && relevantSkillsSelection.skills.length > 0) {
    steps.push(
      createRelevantSkillsStep({ skills: relevantSkillsSelection.skills, source: 'implicit' })
    );
  }

  return steps;
};
