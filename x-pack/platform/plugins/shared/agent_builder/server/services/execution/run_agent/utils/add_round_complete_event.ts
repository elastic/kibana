/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { OperatorFunction } from 'rxjs';
import { map, merge, shareReplay, toArray } from 'rxjs';
import type {
  RoundCompleteEvent,
  RoundInput,
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundStep,
  ReasoningEvent,
  ToolCallEvent,
  RuntimeAgentConfigurationOverrides,
  BackgroundAgentCompleteEvent,
  SubagentRosterUpdatedEvent,
  TodosStep,
  UserQuestionAskedEvent,
} from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents/prompts';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import {
  ChatEventType,
  ConversationRoundStepType,
  ConversationRoundStatus,
  isMessageCompleteEvent,
  isThinkingCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isPromptRequestEvent,
  isReasoningEvent,
  isToolCallStep,
  isBackgroundAgentCompleteEvent,
  isSubagentRosterUpdatedEvent,
  createSubagentRosterUpdatedStep,
  isToolUiEvent,
  carriedOverTodos,
  TODOS_UPDATED_UI_EVENT,
  type TodosUpdatedUiEventData,
  isUserQuestionAskedEvent,
  isUserQuestionAnsweredEvent,
  createAskUserQuestionStep,
} from '@kbn/agent-builder-common';
import type {
  ConversationInternalState,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common/chat';
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
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';
import { formatAttachmentsMetadata } from './attachment_presentation';
import {
  createPreExecutionSteps,
  createBackgroundAgentStep,
  createReasoningStep,
  createToolCallStep,
} from './round_steps';
import { applyResumeResolution } from '../../../conversation/client/merge_rounds';
import { mergeAttachmentRefs } from '../../../conversation/client/migrate_attachments';

// Re-exported so `prepare_conversation` keeps its existing import site.
export { mergeAttachmentRefs };

type SourceEvents = ConvertedEvents;

type StepEvents =
  | ReasoningEvent
  | ToolCallEvent
  | BackgroundAgentCompleteEvent
  | SubagentRosterUpdatedEvent
  | UserQuestionAskedEvent;

const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return (
    isReasoningEvent(event) ||
    isToolCallEvent(event) ||
    isBackgroundAgentCompleteEvent(event) ||
    isSubagentRosterUpdatedEvent(event) ||
    isUserQuestionAskedEvent(event)
  );
};

export const addRoundCompleteEvent = ({
  pendingRound,
  userInput,
  origin,
  author,
  startTime,
  endTime,
  getConversationState,
  modelProvider,
  mainConnectorId,
  stateManager,
  attachmentStateManager,
  configurationOverrides,
  compactionResult,
  roundId: providedRoundId,
  initialTodos,
  relevantSkillsSelection,
  getWorkspaceId,
}: {
  pendingRound: ConversationRound | undefined;
  userInput: RoundInput;
  /**
   * External origin that initiated this execution. Stamps `origin.type` on newly created
   * rounds; resumed rounds keep their original origin.
   */
  origin?: ExecutionConversationOrigin;
  /**
   * Resolved author for the round input (external author, or the Kibana user for public
   * conversations). Stamped on newly created rounds; resumed rounds keep their original author.
   */
  author?: ConversationRoundAuthor;
  startTime: Date;
  modelProvider: ModelProvider;
  /**
   * Connector id of the model driving the agent graph for this round. Used to
   * attribute `model_usage` to the right connector.
   */
  mainConnectorId: string;
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
  /** Skills selected as relevant this round; persisted as a `relevant_skills` step (fresh rounds only) */
  relevantSkillsSelection?: RelevantSkillSelection;
  /** Returns the workspace_id used in this round, if any */
  getWorkspaceId?: () => string | undefined;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(shareReplay());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          const attachmentRefs = attachmentStateManager.getAccessedRefs();
          let round: ConversationRound;
          let resumeExecution: { follow_up_round: ConversationRound } | undefined;
          if (pendingRound) {
            const resumed = resumeRound({
              pendingRound,
              events,
              input: userInput,
              startTime,
              endTime,
              modelProvider,
              mainConnectorId,
              attachmentRefs,
              configurationOverrides,
              compactionResult,
            });
            round = resumed.round;
            resumeExecution = { follow_up_round: resumed.followUpRound };
          } else {
            round = createRound({
              roundId: providedRoundId,
              events,
              input: userInput,
              origin,
              author,
              startTime,
              endTime,
              modelProvider,
              mainConnectorId,
              attachmentRefs,
              configurationOverrides,
              compactionResult,
              initialTodos,
              relevantSkillsSelection,
            });
          }

          round.state = buildRoundState({ round, events, stateManager });
          // exec_k's terminated carries the same resume state as the folded round.
          if (resumeExecution) {
            resumeExecution.follow_up_round.state = round.state;
          }

          if (round.input.attachment_refs && round.input.attachment_refs.length > 0) {
            const attachmentContext = formatAttachmentsMetadata(
              round.input.attachment_refs,
              attachmentStateManager
            );
            if (attachmentContext) {
              round.input = { ...round.input, attachment_context: attachmentContext };
            }
          }

          const workspaceId = getWorkspaceId?.();
          const event: RoundCompleteEvent = {
            type: ChatEventType.roundComplete,
            data: {
              round,
              resumed: pendingRound !== undefined,
              ...(resumeExecution ? { resume_execution: resumeExecution } : {}),
              conversation_state: getConversationState(),
              attachments: attachmentStateManager.getAll(),
              ...(workspaceId ? { workspace_id: workspaceId } : {}),
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
  mainConnectorId,
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
  mainConnectorId: string;
  attachmentRefs: AttachmentVersionRef[];
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  compactionResult?: CompactedConversation;
}): { round: ConversationRound; followUpRound: ConversationRound } => {
  // The resume re-runs the paused tool calls; synthesize their resolved steps (result + progression)
  // from the replayed graph events so they can be persisted as this execution's own steps. The
  // paused tool-call step position/params come from `pendingRound`; the resolved result from here.
  const resolvedToolCallSteps = pendingRound.steps
    .filter(isToolCallStep)
    .filter((step) => step.results.length === 0)
    .map((step) => {
      const toolResults = events
        .filter(isToolResultEvent)
        .filter(({ data }) => data.tool_call_id === step.tool_call_id);
      const toolProgressions = events
        .filter(isToolProgressEvent)
        .filter(({ data }) => data.tool_call_id === step.tool_call_id);
      return {
        ...step,
        results: toolResults.flatMap(({ data }) => data.results),
        progression: [...(step.progression ?? []), ...toolProgressions.map(({ data }) => data)],
      };
    });

  // ask_user_question answers from the replayed answered events, keyed by prompt_id.
  const answers = new Map(
    events
      .filter(isUserQuestionAnsweredEvent)
      .map((event) => [event.data.prompt_id, event.data.answers] as const)
  );

  const followUp = createRound({
    events,
    input,
    startTime,
    endTime,
    modelProvider,
    mainConnectorId,
    attachmentRefs,
    configurationOverrides,
    compactionResult,
  });

  // The resume execution (exec_k): the resolved paused calls (in their original position) followed
  // by the follow-up's own steps. This is both what we fold into the round and what we persist.
  const followUpRound: ConversationRound = {
    ...followUp,
    steps: [...resolvedToolCallSteps, ...followUp.steps],
  };

  const round = applyResumeResolution(pendingRound, followUpRound, answers);

  return { round, followUpRound };
};

const createRound = ({
  roundId: providedRoundId,
  events,
  input,
  origin,
  author,
  startTime,
  endTime = new Date(),
  modelProvider,
  mainConnectorId,
  attachmentRefs,
  configurationOverrides,
  compactionResult,
  initialTodos,
  relevantSkillsSelection,
}: {
  roundId?: string;
  events: SourceEvents[];
  input: RoundInput;
  origin?: ExecutionConversationOrigin;
  author?: ConversationRoundAuthor;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
  mainConnectorId: string;
  attachmentRefs: AttachmentVersionRef[];
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  compactionResult?: CompactedConversation;
  initialTodos?: TodoItem[];
  relevantSkillsSelection?: RelevantSkillSelection;
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
    if (isSubagentRosterUpdatedEvent(event)) {
      return [createSubagentRosterUpdatedStep({ roster: event.data.roster })];
    }
    if (isUserQuestionAskedEvent(event)) {
      return [
        createAskUserQuestionStep({
          prompt_id: event.data.prompt_id,
          questions: event.data.questions,
          // answers remain undefined; back-filled at resume by userQuestionAnsweredEvent
        }),
      ];
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

  const steps: ConversationRoundStep[] = createPreExecutionSteps({
    compactionResult,
    relevantSkillsSelection,
  });

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
      ...(attachmentRefs.length > 0
        ? { attachment_refs: mergeAttachmentRefs(input.attachment_refs, attachmentRefs) }
        : {}),
    },
    steps,
    ...(origin ? { origin: { type: origin.type } } : {}),
    ...(author ? { author } : {}),
    trace_id: getCurrentTraceId(),
    started_at: startTime.toISOString(),
    time_to_first_token: timeToFirstToken,
    time_to_last_token: timeToLastToken,
    model_usage: getModelUsage(modelProvider.getUsageStats(), mainConnectorId),
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

const getModelUsage = (
  stats: ModelProviderStats,
  mainConnectorId: string
): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let hasCachedInputTokens = false;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += call.tokens?.completion ?? 0;
    if (call.tokens?.cached !== undefined) {
      cachedInputTokens += call.tokens.cached;
      hasCachedInputTokens = true;
    }
  }
  const modelFromResponse = stats.calls.find(
    (call) => call.connectorId === mainConnectorId && call.model
  )?.model;

  return {
    connector_id: mainConnectorId,
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ...(hasCachedInputTokens ? { cached_input_tokens: cachedInputTokens } : {}),
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

  // ask_user_question prompts don't need a node-state snapshot as they are stored as steps.
  const toolCallPromptRequests = promptRequestEvents.filter(
    (event) => !isAskUserQuestionPrompt(event.prompt)
  );

  const nodes = toolCallPromptRequests.map((promptRequest) => {
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
