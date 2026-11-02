/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import type {
  ConversationRoundStep,
  ToolCallStep,
  AssistantResponse,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  isToolCallEvent,
  isToolResultEvent,
  isReasoningEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isToolProgressEvent,
  isRoundCompleteEvent,
  isBackgroundAgentCompleteEvent,
} from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from './use_agent_builder_service';

interface UseFollowExecutionResult {
  steps: ConversationRoundStep[];
  isLoading: boolean;
  response?: AssistantResponse;
  /** Partial response message, updated as chunks stream in. */
  streamingMessage: string;
  error?: string;
}

export const useFollowExecution = (executionId: string | null): UseFollowExecutionResult => {
  const [steps, setSteps] = useState<ConversationRoundStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | undefined>();
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const { chatService } = useAgentBuilderServices();

  useEffect(() => {
    if (!executionId) return;

    setSteps([]);
    setIsLoading(true);
    setResponse(undefined);
    setStreamingMessage('');
    setError(undefined);

    const abortController = new AbortController();
    abortRef.current = abortController;

    const subscription = chatService
      .followExecution(executionId, abortController.signal)
      .subscribe({
        next: (event) => {
          if (isReasoningEvent(event) && !event.data.transient) {
            setSteps((prev) => [
              ...prev,
              {
                type: ConversationRoundStepType.reasoning,
                reasoning: event.data.reasoning,
                tool_call_id: event.data.tool_call_id,
                tool_call_group_id: event.data.tool_call_group_id,
              },
            ]);
          } else if (isToolCallEvent(event)) {
            setSteps((prev) => [
              ...prev,
              {
                type: ConversationRoundStepType.toolCall,
                tool_call_id: event.data.tool_call_id,
                tool_id: event.data.tool_id,
                params: event.data.params,
                results: [],
                tool_call_group_id: event.data.tool_call_group_id,
              } as ToolCallStep,
            ]);
          } else if (isToolResultEvent(event)) {
            setSteps((prev) =>
              prev.map((step) => {
                if (
                  step.type === ConversationRoundStepType.toolCall &&
                  (step as ToolCallStep).tool_call_id === event.data.tool_call_id
                ) {
                  return { ...step, results: event.data.results } as ToolCallStep;
                }
                return step;
              })
            );
          } else if (isToolProgressEvent(event)) {
            setSteps((prev) =>
              prev.map((step) => {
                if (
                  step.type === ConversationRoundStepType.toolCall &&
                  (step as ToolCallStep).tool_call_id === event.data.tool_call_id
                ) {
                  const toolStep = step as ToolCallStep;
                  return {
                    ...toolStep,
                    progression: [
                      ...(toolStep.progression ?? []),
                      {
                        message: event.data.message,
                        ...(event.data.metadata ? { metadata: event.data.metadata } : {}),
                      },
                    ],
                  } as ToolCallStep;
                }
                return step;
              })
            );
          } else if (isBackgroundAgentCompleteEvent(event)) {
            setSteps((prev) => [
              ...prev,
              {
                type: ConversationRoundStepType.backgroundAgentComplete,
                ...event.data.execution,
              } as ConversationRoundStep,
            ]);
          } else if (isMessageChunkEvent(event)) {
            setStreamingMessage((prev) => prev + event.data.text_chunk);
          } else if (isMessageCompleteEvent(event)) {
            setStreamingMessage(event.data.message_content);
          } else if (isRoundCompleteEvent(event)) {
            setResponse(event.data.round.response);
            setIsLoading(false);
          }
        },
        error: (err) => {
          setError(err.message ?? 'Unknown error');
          setIsLoading(false);
        },
        complete: () => {
          setIsLoading(false);
        },
      });

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  }, [executionId, chatService]);

  return { steps, isLoading, response, streamingMessage, error };
};
