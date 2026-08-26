/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subject } from 'rxjs';
import type {
  AgentBuilderEvent,
  ChatAgentEvent,
  ConversationRoundStep,
  RoundStepEvent,
  ToolCallEvent,
  ToolProgressEvent,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
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
import { createBackgroundAgentStep, createReasoningStep, createToolCallStep } from './round_steps';

export const emitExecutionStepEvents = ({
  graphEvents$,
  manualEvents$,
  roundId,
  executionId,
  initialSequence,
}: {
  graphEvents$: Observable<AgentBuilderEvent<string, any>>;
  manualEvents$: Subject<ChatAgentEvent>;
  roundId: string;
  executionId: string;
  /** starting `sequence` for the first streamed step. */
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
        const toolProgress = pendingToolProgress.get(event.data.tool_call_id) ?? [];
        pendingToolProgress.delete(event.data.tool_call_id);
        emitStep(createToolCallStep({ toolCall, toolResult: event, toolProgress }));
        return;
      }
      if (isReasoningEvent(event)) {
        if (event.data.transient !== true) {
          emitStep(createReasoningStep(event));
        }
        return;
      }
      if (isBackgroundAgentCompleteEvent(event)) {
        emitStep(createBackgroundAgentStep(event));
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
