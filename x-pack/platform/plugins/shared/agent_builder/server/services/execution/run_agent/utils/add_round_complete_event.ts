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
  ChatAgentEvent,
  RoundCompleteEvent,
  RoundInput,
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundStep,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents/prompts';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import {
  ChatEventType,
  ConversationRoundStatus,
  isMessageCompleteEvent,
  isThinkingCompleteEvent,
  isPromptRequestEvent,
  isToolCallStep,
  isUserQuestionAnsweredEvent,
} from '@kbn/agent-builder-common';
import type { ConversationInternalState } from '@kbn/agent-builder-common/chat';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getCurrentTraceId } from '../../../../tracing';
import type { RunAttachmentEvents } from '../run_attachment_events';
import type { RunStateSnapshot, RunTracker } from '../run_tracker';
import { persistableSteps } from '../step_state';
import type { PendingTurn } from './conversation_turn';
import { getModelUsage } from './round_summary';
import { applyResumeResolution } from '../../../conversation/client/merge_rounds';

type SourceEvents = ChatAgentEvent;

export const addRoundCompleteEvent = ({
  pendingTurn,
  tracker,
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
  roundId: providedRoundId,
  getWorkspaceId,
  runAttachmentEvents,
}: {
  /** The turn being resumed, when this execution is a HITL resume. */
  pendingTurn: PendingTurn | undefined;
  /** The out-of-band tool events LangGraph never saw and the resume seed (see `RunTracker`). */
  tracker: RunTracker;
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
  /** Optional pre-generated round ID. If not provided, a new UUID is generated. */
  roundId?: string;
  /** Returns the workspace_id used in this round, if any */
  getWorkspaceId?: () => string | undefined;
  /** The run's attachment events; drained for the last time here. */
  runAttachmentEvents: RunAttachmentEvents;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(shareReplay());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          const finalGraphState = tracker.finalState();
          const fullSteps = resolveRoundSteps({ tracker, finalGraphState });

          let round: ConversationRound;
          let resumeExecution: { follow_up_round: ConversationRound } | undefined;
          if (pendingTurn) {
            const resumed = resumeRound({
              pendingTurn,
              tracker,
              finalGraphState,
              fullSteps,
              events,
              input: userInput,
              startTime,
              endTime,
              modelProvider,
              mainConnectorId,
              configurationOverrides,
            });
            round = resumed.round;
            resumeExecution = { follow_up_round: resumed.followUpRound };
          } else {
            round = createRound({
              roundId: providedRoundId,
              steps: fullSteps,
              events,
              input: userInput,
              origin,
              author,
              startTime,
              endTime,
              modelProvider,
              mainConnectorId,
              configurationOverrides,
              lastCallInputTokens: finalGraphState.lastCallUsage?.inputTokens,
            });
          }

          round.state = buildRoundState({ round, events, finalGraphState, stateManager });
          // exec_k's terminated carries the same resume state as the folded round.
          if (resumeExecution) {
            resumeExecution.follow_up_round.state = round.state;
          }

          runAttachmentEvents.drainRemaining();
          const attachmentEvents = runAttachmentEvents.list();

          const workspaceId = getWorkspaceId?.();
          const event: RoundCompleteEvent = {
            type: ChatEventType.roundComplete,
            data: {
              round,
              resumed: pendingTurn !== undefined,
              ...(resumeExecution ? { resume_execution: resumeExecution } : {}),
              conversation_state: getConversationState(),
              attachments: attachmentStateManager.getAll(),
              ...(attachmentEvents.length > 0 ? { attachment_events: attachmentEvents } : {}),
              ...(workspaceId ? { workspace_id: workspaceId } : {}),
            },
          };

          return event;
        })
      )
    );
  };
};

/**
 * The round's full steps: the final graph `steps` channel plus what LangGraph never saw (progress on
 * a call interrupted by a prompt, an unconsumed `todo_write`), minus the runtime-only browser /
 * dedicated-lifecycle calls.
 */
const resolveRoundSteps = ({
  tracker,
  finalGraphState,
}: {
  tracker: RunTracker;
  finalGraphState: RunStateSnapshot;
}): ConversationRoundStep[] =>
  persistableSteps(tracker.attachUnseen(finalGraphState.steps), finalGraphState.toolRenderState);

const resumeRound = ({
  pendingTurn,
  tracker,
  finalGraphState,
  fullSteps,
  events,
  input,
  startTime,
  endTime = new Date(),
  modelProvider,
  mainConnectorId,
  configurationOverrides,
}: {
  pendingTurn: PendingTurn;
  tracker: RunTracker;
  finalGraphState: RunStateSnapshot;
  fullSteps: ConversationRoundStep[];
  events: SourceEvents[];
  input: RoundInput;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
  mainConnectorId: string;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
}): { round: ConversationRound; followUpRound: ConversationRound } => {
  // ask_user_question answers from the replayed answered events, keyed by prompt_id.
  const answers = new Map(
    events
      .filter(isUserQuestionAnsweredEvent)
      .map((event) => [event.data.prompt_id, event.data.answers] as const)
  );

  // The resume execution (exec_k): the steps this execution owns — the resolved paused calls (with
  // only the progression observed since the pause), the new steps and a rewritten todos step.
  const followUpRound = createRound({
    steps: tracker.executionProjection(finalGraphState),
    events,
    input,
    startTime,
    endTime,
    modelProvider,
    mainConnectorId,
    configurationOverrides,
    lastCallInputTokens: finalGraphState.lastCallUsage?.inputTokens,
  });

  // Input / attachment / usage / timing / trace / overrides merge semantics come from the legacy
  // compat round; the logical steps come from the graph rather than from re-merging step lists.
  const round: ConversationRound = {
    ...applyResumeResolution(pendingTurn.compatRound, followUpRound, answers),
    steps: fullSteps,
  };

  return { round, followUpRound };
};

const createRound = ({
  roundId: providedRoundId,
  steps,
  events,
  input,
  origin,
  author,
  startTime,
  endTime = new Date(),
  modelProvider,
  mainConnectorId,
  configurationOverrides,
  lastCallInputTokens,
}: {
  roundId?: string;
  steps: ConversationRoundStep[];
  events: SourceEvents[];
  input: RoundInput;
  origin?: ExecutionConversationOrigin;
  author?: ConversationRoundAuthor;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
  mainConnectorId: string;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  lastCallInputTokens?: number;
}): ConversationRound => {
  const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
  const thinkingCompleteEvent = events.find(isThinkingCompleteEvent);
  const promptRequestEvents = events.filter(isPromptRequestEvent);

  const lastMessage = messages.length ? messages[messages.length - 1] : undefined;
  const hasPromptRequests = promptRequestEvents.length > 0;

  if (!lastMessage && !hasPromptRequests) {
    throw new Error('No response event found in round events');
  }

  const timeToLastToken = endTime.getTime() - startTime.getTime();
  const timeToFirstToken = thinkingCompleteEvent
    ? thinkingCompleteEvent.data.time_to_first_token
    : timeToLastToken;

  const round: ConversationRound = {
    id: providedRoundId ?? uuidv4(),
    status: hasPromptRequests
      ? ConversationRoundStatus.awaitingPrompt
      : ConversationRoundStatus.completed,
    pending_prompts: hasPromptRequests ? promptRequestEvents.map((e) => e.data.prompt) : undefined,
    state: undefined,
    input,
    steps,
    ...(origin ? { origin: { type: origin.type } } : {}),
    ...(author ? { author } : {}),
    trace_id: getCurrentTraceId(),
    started_at: startTime.toISOString(),
    time_to_first_token: timeToFirstToken,
    time_to_last_token: timeToLastToken,
    model_usage: getModelUsage(modelProvider.getUsageStats(), mainConnectorId, lastCallInputTokens),
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

const buildRoundState = ({
  round,
  events,
  finalGraphState,
  stateManager,
}: {
  round: ConversationRound;
  events: SourceEvents[];
  finalGraphState: RunStateSnapshot;
  stateManager: ConversationStateManager;
}): RoundState | undefined => {
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
