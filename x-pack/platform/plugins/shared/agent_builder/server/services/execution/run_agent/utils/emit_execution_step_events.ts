/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subject } from 'rxjs';
import type {
  AgentBuilderEvent,
  BackgroundAgentCompleteEvent,
  ChatAgentEvent,
  ConversationRound,
  ConversationRoundStep,
  ReasoningEvent,
  RoundStepEvent,
  ToolCallEvent,
  ToolProgressEvent,
  ToolResultEvent,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationRoundStepType,
  createAskUserQuestionStep,
  createSubagentRosterUpdatedStep,
  isBackgroundAgentCompleteEvent,
  isReasoningEvent,
  isSubagentRosterUpdatedEvent,
  isToolCallEvent,
  isToolProgressEvent,
  isToolResultEvent,
  isUserQuestionAskedEvent,
} from '@kbn/agent-builder-common';
import type { CompactedConversation } from './conversation_compactor';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';

export const computeFreshRoundStepOffset = ({
  compactionResult,
  relevantSkillsSelection,
}: {
  compactionResult?: CompactedConversation;
  relevantSkillsSelection?: RelevantSkillSelection;
}): number => {
  const compactionOffset =
    compactionResult?.compactionTriggered && compactionResult.summary ? 1 : 0;
  const relevantSkillsOffset =
    relevantSkillsSelection && relevantSkillsSelection.skills.length > 0 ? 1 : 0;
  return compactionOffset + relevantSkillsOffset;
};

export const emitExecutionStepEvents = ({
  graphEvents$,
  manualEvents$,
  roundId,
  executionId,
  triggerEventId,
  initialSequence,
}: {
  graphEvents$: Observable<AgentBuilderEvent<string, any>>;
  manualEvents$: Subject<ChatAgentEvent>;
  roundId: string;
  executionId: string;
  /** id of the `user_message` event that triggered this run; carried on the step event's payload. */
  triggerEventId: string;
  /** starting `sequence` for the first streamed step (wrapper prefix, or paused-round step count). */
  initialSequence: number;
}): (() => void) => {
  let sequence = initialSequence;
  const pendingToolCalls = new Map<string, ToolCallEvent>();
  const pendingToolProgress = new Map<string, ToolProgressEvent[]>();

  const emitStep = (step: ConversationRoundStep): void => {
    const roundStepEvent: RoundStepEvent = {
      type: ChatEventType.executionStep,
      data: {
        round_id: roundId,
        execution_id: executionId,
        step,
        sequence: sequence++,
      },
    };
    manualEvents$.next(roundStepEvent);
    void triggerEventId;
  };

  const subscription = graphEvents$.subscribe({
    next: (event) => {
      if (isToolCallEvent(event)) {
        pendingToolCalls.set(event.data.tool_call_id, event);
        return;
      }
      if (isToolProgressEvent(event)) {
        const bucket = pendingToolProgress.get(event.data.tool_call_id) ?? [];
        bucket.push(event);
        pendingToolProgress.set(event.data.tool_call_id, bucket);
        return;
      }
      if (isToolResultEvent(event)) {
        const toolCall = pendingToolCalls.get(event.data.tool_call_id);
        if (!toolCall) {
          return;
        }
        pendingToolCalls.delete(event.data.tool_call_id);
        const progressEvents = pendingToolProgress.get(event.data.tool_call_id) ?? [];
        pendingToolProgress.delete(event.data.tool_call_id);
        emitStep(buildToolCallStep(toolCall, event, progressEvents));
        return;
      }
      if (isReasoningEvent(event)) {
        if (event.data.transient !== true) {
          emitStep(buildReasoningStep(event));
        }
        return;
      }
      if (isBackgroundAgentCompleteEvent(event)) {
        emitStep(buildBackgroundAgentStep(event));
        return;
      }
      if (isSubagentRosterUpdatedEvent(event)) {
        emitStep(createSubagentRosterUpdatedStep({ roster: event.data.roster }));
        return;
      }
      if (isUserQuestionAskedEvent(event)) {
        emitStep(
          createAskUserQuestionStep({
            prompt_id: event.data.prompt_id,
            questions: event.data.questions,
          })
        );
        return;
      }
    },
  });

  return () => subscription.unsubscribe();
};

export const resumedRoundStepOffset = (pendingRound: Pick<ConversationRound, 'steps'>): number =>
  pendingRound.steps.length;

const buildToolCallStep = (
  toolCall: ToolCallEvent,
  toolResult: ToolResultEvent,
  toolProgress: ToolProgressEvent[]
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_id: toolCall.data.tool_id,
  params: toolCall.data.params,
  tool_call_id: toolCall.data.tool_call_id,
  progression: toolProgress.map(({ data: { message, metadata } }) => ({ message, metadata })),
  results: toolResult.data.results,
  tool_call_group_id: toolCall.data.tool_call_group_id,
  tool_origin: toolCall.data.tool_origin,
  tool_type: toolCall.data.tool_type,
});

const buildReasoningStep = (event: ReasoningEvent): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: event.data.reasoning,
  tool_call_id: event.data.tool_call_id,
  tool_call_group_id: event.data.tool_call_group_id,
});

const buildBackgroundAgentStep = (event: BackgroundAgentCompleteEvent): ConversationRoundStep => ({
  type: ConversationRoundStepType.backgroundAgentComplete,
  ...event.data.execution,
});
