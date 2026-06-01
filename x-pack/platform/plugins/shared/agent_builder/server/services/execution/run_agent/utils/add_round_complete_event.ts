/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { OperatorFunction } from 'rxjs';
import { map, merge, share, toArray } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type {
  RoundCompleteEvent,
  RoundInput,
  ConversationRound,
  ConversationRoundStep,
  ReasoningEvent,
  ToolCallEvent,
  ReasoningStep,
  ToolCallStep,
  ToolProgressEvent,
  ToolResultEvent,
  RuntimeAgentConfigurationOverrides,
  CompactionStep,
  BackgroundAgentCompleteEvent,
  BackgroundAgentCompleteStep,
  TodosStep,
} from '@kbn/agent-builder-common';
import type { FormPromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import {
  ChatEventType,
  ConversationRoundStepType,
  ConversationRoundStatus,
  isHitlFormResponseStaleStepData,
  isMessageCompleteEvent,
  isOtherStep,
  isThinkingCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isPromptRequestEvent,
  isReasoningEvent,
  isToolCallStep,
  isBackgroundAgentCompleteEvent,
  isToolUiEvent,
  carriedOverTodos,
  TODOS_UPDATED_UI_EVENT,
  type TodosUpdatedUiEventData,
} from '@kbn/agent-builder-common';
import type {
  ConversationInternalState,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common/chat';
import type { Logger } from '@kbn/logging';
import type {
  ConversationStateManager,
  ModelProvider,
  ModelProviderStats,
} from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getCurrentTraceId } from '../../../../tracing';
import type { ConvertedEvents } from '../convert_graph_events';
import { isFinalStateEvent } from '../events';
import type { CompactedConversation } from './conversation_compactor';

type SourceEvents = ConvertedEvents;

type StepEvents = ReasoningEvent | ToolCallEvent | BackgroundAgentCompleteEvent;

const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return isReasoningEvent(event) || isToolCallEvent(event) || isBackgroundAgentCompleteEvent(event);
};

export const addRoundCompleteEvent = ({
  pendingRound,
  pendingFormPrompts,
  userInput,
  startTime,
  endTime,
  getConversationState,
  modelProvider,
  stateManager,
  attachmentStateManager,
  configurationOverrides,
  compactionResult,
  roundId: providedRoundId,
  initialTodos,
  logger,
}: {
  pendingRound: ConversationRound | undefined;
  /**
   * FormPromptRequests for the next waitForInput steps collected from resumedStates
   * (nextFormPrompt). These are merged into the new round's pending_prompts so
   * the client renders the next form without waiting for another LLM round.
   */
  pendingFormPrompts?: FormPromptRequest[];
  userInput: RoundInput;
  startTime: Date;
  modelProvider: ModelProvider;
  stateManager: ConversationStateManager;
  getConversationState: () => ConversationInternalState;
  attachmentStateManager: AttachmentStateManager;
  endTime?: Date;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  /** Result of the compaction pipeline; used to build the compaction step and audit trail */
  compactionResult?: CompactedConversation;
  /** Optional pre-generated round ID. If not provided, a new UUID is generated. */
  roundId?: string;
  /** Todo list at round start; used as fallback when the agent never called todoWrite this round */
  initialTodos?: TodoItem[];
  /** Optional logger for [hitl-debug] instrumentation. */
  logger?: Logger;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(share());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          logger?.debug(
            () =>
              `[hitl-debug][ab] addRound.start pendingFormPrompts=${
                pendingFormPrompts?.length ?? 0
              }`
          );

          const attachmentRefs = attachmentStateManager.getAccessedRefs();
          const round = pendingRound
            ? resumeRound({
                pendingRound,
                events,
                input: userInput,
                startTime,
                endTime,
                modelProvider,
                attachmentRefs,
                configurationOverrides,
                compactionResult,
              })
            : createRound({
                roundId: providedRoundId,
                events,
                input: userInput,
                startTime,
                endTime,
                modelProvider,
                attachmentRefs,
                configurationOverrides,
                compactionResult,
                initialTodos,
              });

          // Evict any pending_prompts whose step_execution_id matches a hitl_form_response_stale
          // audit step — the user submitted that form but it was rejected (CAS miss). Leaving
          // the stale form in pending_prompts would cause it to re-appear as an active input
          // alongside the freshly-advanced step, trapping the user in an infinite submit loop.
          const staleStepIds = new Set(
            round.steps
              .filter((s) => isOtherStep(s) && isHitlFormResponseStaleStepData(s))
              .map((s) => s.step_execution_id)
          );
          if (staleStepIds.size > 0 && round.pending_prompts?.length) {
            round.pending_prompts = round.pending_prompts.filter((p) => !staleStepIds.has(p.id));
            logger?.debug(
              () =>
                `[hitl-debug][ab] addRound.evictStale count=${staleStepIds.size} remaining=${
                  round.pending_prompts?.length ?? 0
                }`
            );
          }

          // Merge server-polled next-step form prompts (from resumedStates.nextFormPrompt)
          // into pending_prompts. Deduplicate by step_execution_id to avoid double-rendering
          // when the tool call path and the poll path both see the same step.
          if (pendingFormPrompts?.length) {
            const existingIds = new Set((round.pending_prompts ?? []).map((p) => p.id));
            const newPrompts = pendingFormPrompts.filter((p) => !existingIds.has(p.id));
            const pre = round.pending_prompts?.length ?? 0;
            if (newPrompts.length > 0) {
              const merged = [...(round.pending_prompts ?? []), ...newPrompts];
              round.pending_prompts = merged;
              round.status = ConversationRoundStatus.awaitingPrompt;
              logger?.debug(
                () =>
                  `[hitl-debug][ab] addRound.merge pre=${pre} post=${
                    merged.length
                  } dedupedIds=${newPrompts.map((p) => p.step_execution_id).join(',')}`
              );
              logger?.debug(
                () => `[hitl-debug][ab] addRound.awaitingPrompt roundStatus=awaitingPrompt`
              );
            } else {
              logger?.debug(
                () =>
                  `[hitl-debug][ab] addRound.merge pre=${pre} post=${pre} dedupedIds=(all_dupes)`
              );
            }
          } else {
            logger?.debug(
              () =>
                `[hitl-debug][ab] addRound.merge pre=${round.pending_prompts?.length ?? 0} post=${
                  round.pending_prompts?.length ?? 0
                } dedupedIds=(none)`
            );
          }

          round.state = buildRoundState({ round, events, stateManager });

          const event: RoundCompleteEvent = {
            type: ChatEventType.roundComplete,
            data: {
              round,
              resumed: pendingRound !== undefined,
              conversation_state: getConversationState(),
              attachments: attachmentStateManager.getAll(),
            },
          };

          return event;
        })
      )
    );
  };
};

const resumeRound = ({
  pendingRound,
  events,
  input,
  startTime,
  endTime = new Date(),
  modelProvider,
  attachmentRefs,
  configurationOverrides,
  compactionResult,
}: {
  pendingRound: ConversationRound;
  events: SourceEvents[];
  input: RoundInput;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
  attachmentRefs: AttachmentVersionRef[];
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  compactionResult?: CompactedConversation;
}): ConversationRound => {
  // Replay tool events for all pending steps (those with empty results)
  const pendingSteps = pendingRound.steps
    .filter(isToolCallStep)
    .filter((step) => step.results.length === 0);

  for (const step of pendingSteps) {
    const toolCallId = step.tool_call_id;
    const toolResults = events
      .filter(isToolResultEvent)
      .filter(({ data }) => data.tool_call_id === toolCallId);
    const toolProgressions = events
      .filter(isToolProgressEvent)
      .filter(({ data }) => data.tool_call_id === toolCallId);

    step.results = toolResults.flatMap(({ data }) => data.results);
    step.progression = [...(step.progression ?? []), ...toolProgressions.map(({ data }) => data)];
  }

  const followUp = createRound({
    events,
    input,
    startTime,
    endTime,
    modelProvider,
    attachmentRefs,
    configurationOverrides,
    compactionResult,
  });

  return mergeRounds(pendingRound, followUp);
};

const staleFormFallbackMessage = i18n.translate(
  'xpack.agentBuilder.hitl.staleFormResponseFallback',
  {
    defaultMessage: 'Your input has been recorded. The workflow continued without it.',
  }
);

const mergeRounds = (previous: ConversationRound, next: ConversationRound): ConversationRound => {
  let traceId: string[] | undefined;
  if (previous.trace_id || next.trace_id) {
    traceId = [
      ...(previous.trace_id
        ? Array.isArray(previous.trace_id)
          ? previous.trace_id
          : [previous.trace_id]
        : []),
      ...(next.trace_id ? (Array.isArray(next.trace_id) ? next.trace_id : [next.trace_id]) : []),
    ];
  }

  // When the agent run does not produce new prompt requests, inherit any pending_prompts
  // that were written to the DB during resumeFormPrompts (e.g. a newly advanced HITL step).
  const mergedPendingPrompts =
    next.pending_prompts ??
    (previous.pending_prompts?.length ? previous.pending_prompts : undefined);
  const mergedStatus = mergedPendingPrompts?.length
    ? ConversationRoundStatus.awaitingPrompt
    : next.status;

  // When the LLM produces no narration on the stale HITL path, use a deterministic
  // fallback so slot 4 (RoundResponse) is never left blank after the refetch.
  const hasStaleFormStep = previous.steps.some(
    (step) => isOtherStep(step) && isHitlFormResponseStaleStepData(step)
  );
  const responseMessage =
    next.response.message || (hasStaleFormStep ? staleFormFallbackMessage : '');

  const mergedRound: ConversationRound = {
    id: previous.id,
    status: mergedStatus,
    pending_prompts: mergedPendingPrompts,
    state: undefined, // state is recomputed after the merge
    input: mergeRoundInput(previous.input, next.input),
    steps: [...previous.steps, ...next.steps],
    trace_id: traceId,
    started_at: previous.started_at,
    time_to_first_token: previous.time_to_first_token + next.time_to_first_token,
    time_to_last_token: previous.time_to_last_token + next.time_to_last_token,
    model_usage: mergeModelUsage(previous.model_usage, next.model_usage),
    response: { ...next.response, message: responseMessage },
    configuration_overrides: next.configuration_overrides ?? previous.configuration_overrides,
  };

  return mergedRound;
};

const mergeRoundInput = (previous: RoundInput, next: RoundInput): RoundInput => {
  const mergedRefs = mergeAttachmentRefs(previous.attachment_refs, next.attachment_refs);
  return {
    ...previous,
    ...next,
    message: next.message || previous.message,
    ...(mergedRefs ? { attachment_refs: mergedRefs } : {}),
  };
};

const mergeAttachmentRefs = (
  previous?: AttachmentVersionRef[],
  next?: AttachmentVersionRef[]
): AttachmentVersionRef[] | undefined => {
  if (!previous?.length && !next?.length) return undefined;
  const merged = new Map<string, AttachmentVersionRef>();
  for (const ref of previous ?? []) {
    merged.set(
      `${ref.attachment_id}:${ref.version}:${ref.actor ?? ATTACHMENT_REF_ACTOR.system}`,
      ref
    );
  }
  for (const ref of next ?? []) {
    merged.set(
      `${ref.attachment_id}:${ref.version}:${ref.actor ?? ATTACHMENT_REF_ACTOR.system}`,
      ref
    );
  }
  return Array.from(merged.values());
};

const createRound = ({
  roundId: providedRoundId,
  events,
  input,
  startTime,
  endTime = new Date(),
  modelProvider,
  attachmentRefs,
  configurationOverrides,
  compactionResult,
  initialTodos,
}: {
  roundId?: string;
  events: SourceEvents[];
  input: RoundInput;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
  attachmentRefs: AttachmentVersionRef[];
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  compactionResult?: CompactedConversation;
  initialTodos?: TodoItem[];
}): ConversationRound => {
  const toolResults = events.filter(isToolResultEvent);
  const toolProgressions = events.filter(isToolProgressEvent);
  const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
  const stepEvents = events.filter(isStepEvent);
  const thinkingCompleteEvent = events.find(isThinkingCompleteEvent);
  const promptRequestEvents = events.filter(isPromptRequestEvent);

  // Collect todos_updated UI events; only the last snapshot is stored as a round step
  const lastTodosData = events.reduce<TodoItem[] | undefined>((last, e) => {
    if (
      isToolUiEvent<typeof TODOS_UPDATED_UI_EVENT, TodosUpdatedUiEventData>(
        e,
        TODOS_UPDATED_UI_EVENT
      )
    ) {
      return e.data.data.todos;
    }
    return last;
  }, undefined);

  const eventToStep = (event: StepEvents): ConversationRoundStep[] => {
    if (isToolCallEvent(event)) {
      const toolCall = event.data;
      const toolResult = toolResults.find(
        (result) => result.data.tool_call_id === toolCall.tool_call_id
      );
      const toolProgress = toolProgressions.filter(
        (progressEvent) => progressEvent.data.tool_call_id === toolCall.tool_call_id
      );

      return [createToolCallStep({ toolCall: event, toolResult, toolProgress })];
    }
    if (isReasoningEvent(event)) {
      if (event.data.transient !== true) {
        return [createReasoningStep(event)];
      } else {
        return [];
      }
    }
    if (isBackgroundAgentCompleteEvent(event)) {
      return [createBackgroundAgentStep(event)];
    }
    throw new Error(`Unknown event type: ${(event as any).type}`);
  };

  const lastMessage = messages.length ? messages[messages.length - 1] : undefined;
  const hasPromptRequests = promptRequestEvents.length > 0;

  if (!lastMessage && !hasPromptRequests) {
    throw new Error('No response event found in round events');
  }

  const timeToLastToken = endTime.getTime() - startTime.getTime();
  const timeToFirstToken = thinkingCompleteEvent
    ? thinkingCompleteEvent.data.time_to_first_token
    : timeToLastToken;

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

  steps.push(...stepEvents.flatMap(eventToStep));

  const todosForStep = lastTodosData ?? carriedOverTodos(initialTodos);
  if (todosForStep !== undefined) {
    const todosStep: TodosStep = {
      type: ConversationRoundStepType.updateTodos,
      todos: todosForStep,
      ...(lastTodosData === undefined ? { carried_over: true } : {}),
    };
    steps.push(todosStep);
  }

  const round: ConversationRound = {
    id: providedRoundId ?? uuidv4(),
    status: hasPromptRequests
      ? ConversationRoundStatus.awaitingPrompt
      : ConversationRoundStatus.completed,
    pending_prompts: hasPromptRequests ? promptRequestEvents.map((e) => e.data.prompt) : undefined,
    state: undefined,
    input: {
      ...input,
      ...(attachmentRefs.length > 0 ? { attachment_refs: attachmentRefs } : {}),
    },
    steps,
    trace_id: getCurrentTraceId(),
    started_at: startTime.toISOString(),
    time_to_first_token: timeToFirstToken,
    time_to_last_token: timeToLastToken,
    model_usage: getModelUsage(modelProvider.getUsageStats()),
    response: lastMessage
      ? {
          message: lastMessage.message_content,
          structured_output: lastMessage.structured_output,
        }
      : { message: '' },
    configuration_overrides: configurationOverrides,
  };

  return round;
};

const createReasoningStep = (event: ReasoningEvent): ReasoningStep => {
  return {
    type: ConversationRoundStepType.reasoning,
    reasoning: event.data.reasoning,
    tool_call_id: event.data.tool_call_id,
    tool_call_group_id: event.data.tool_call_group_id,
  };
};

const createBackgroundAgentStep = (
  event: BackgroundAgentCompleteEvent
): BackgroundAgentCompleteStep => {
  return {
    type: ConversationRoundStepType.backgroundAgentComplete,
    ...event.data.execution,
  };
};

const createToolCallStep = ({
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
  };
};

const getModelUsage = (stats: ModelProviderStats): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += call.tokens?.completion ?? 0;
  }
  const modelFromResponse = stats.calls.find((call) => call.model)?.model;

  return {
    // we don't support multi-models yet, so we can just pick from the first call
    connector_id: stats.calls.length ? stats.calls[0].connectorId : 'unknown',
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ...(modelFromResponse ? { model: modelFromResponse } : {}),
  };
};

const buildRoundState = ({
  round,
  events,
  stateManager,
}: {
  round: ConversationRound;
  events: SourceEvents[];
  stateManager: ConversationStateManager;
}): RoundState | undefined => {
  const finalGraphState = events.find(isFinalStateEvent)!.data.state;
  const promptRequestEvents = events.filter(isPromptRequestEvent).map((event) => event.data);

  if (promptRequestEvents.length === 0) {
    return undefined;
  }

  const nodes = promptRequestEvents.map((promptRequest) => {
    const toolCallId = promptRequest.source.tool_call_id;
    const toolCall = round.steps
      .filter(isToolCallStep)
      .find((step) => step.tool_call_id === toolCallId);

    if (!toolCall) {
      throw new Error(`Could not find tool call with id ${toolCallId} in round steps`);
    }

    const toolState = stateManager
      .getToolStateManager({ toolId: toolCall.tool_id, toolCallId })
      .getState();

    return {
      step: 'execute_tool' as const,
      tool_call_id: toolCallId,
      tool_id: toolCall.tool_id,
      tool_params: toolCall.params,
      tool_state: toolState,
    };
  });

  const state: RoundState = {
    version: 2,
    agent: {
      current_cycle: finalGraphState.currentCycle ?? 0,
      error_count: finalGraphState.errorCount ?? 0,
      nodes,
    },
  };

  return state;
};

const mergeModelUsage = (
  a: RoundModelUsageStats,
  b: RoundModelUsageStats
): RoundModelUsageStats => {
  return {
    connector_id: a.connector_id,
    llm_calls: a.llm_calls + b.llm_calls,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    model: a.model ?? b.model,
  };
};
