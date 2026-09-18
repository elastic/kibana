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
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { EventActorType } from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents/prompts';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
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
import type {
  AttachmentChange,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import { attachmentChangesToEvents } from '@kbn/agent-builder-server/attachments';
import { getCurrentTraceId } from '../../../../tracing';
import {
  ROUND_DERIVED_EVENT_ID_SUFFIXES,
  userMessageActor,
} from '../../../conversation/client/rounds_to_events';
import type { ConvertedEvents } from '../convert_graph_events';
import { isFinalStateEvent } from '../events';
import type { CompactedConversation } from './conversation_compactor';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';
import { formatAttachmentsMetadata } from './attachment_presentation';
import { eventsToSteps, getModelUsage, resolvePausedToolCallSteps } from './round_summary';
import { applyResumeResolution } from '../../../conversation/client/merge_rounds';
import { mergeAttachmentRefs } from '../../../conversation/client/migrate_attachments';

type SourceEvents = ConvertedEvents;

/**
 * `chat_input` (attachments sent with the message) and `execution` (made by tools) attachment
 * events for a run, stamped with the round's initial execution id. Shared by the success and the
 * interruption paths.
 */
export const buildAttachmentEvents = ({
  conversation,
  round,
  chatInputChanges,
  executionChanges,
  agentId,
  createdAt,
}: {
  conversation: Conversation | undefined;
  round: Pick<ConversationRound, 'id' | 'author' | 'origin'>;
  chatInputChanges: AttachmentChange[];
  executionChanges: AttachmentChange[];
  agentId: string;
  createdAt: string;
}) => {
  const executionId = `${round.id}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`;
  return [
    ...attachmentChangesToEvents(chatInputChanges, {
      source: 'chat_input',
      actor: userMessageActor(conversation, round),
      execution_id: executionId,
      created_at: createdAt,
    }),
    ...attachmentChangesToEvents(executionChanges, {
      source: 'execution',
      actor: { type: EventActorType.agent, id: agentId },
      execution_id: executionId,
      created_at: createdAt,
    }),
  ];
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
  chatInputChanges,
  agentId,
  conversation,
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
  /**
   * Attachment changes caused by the incoming message (drained from the state manager right after
   * `prepareConversation`). Emitted as `chat_input` attachment events.
   */
  chatInputChanges: AttachmentChange[];
  /** Agent running this round; actor of the `execution` attachment events. */
  agentId: string;
  /**
   * Existing conversation, when this round is on an already-persisted one. Undefined for CREATE.
   * Used to resolve the `chat_input` actor's fallback to the conversation owner when the round
   * carries no author.
   */
  conversation: Conversation | undefined;
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
              if (resumeExecution) {
                resumeExecution.follow_up_round.input = {
                  ...resumeExecution.follow_up_round.input,
                  attachment_context: attachmentContext,
                };
              }
            }
          }

          const attachmentEvents = buildAttachmentEvents({
            conversation,
            round,
            chatInputChanges,
            executionChanges: attachmentStateManager.drainChanges(),
            agentId,
            createdAt: (endTime ?? new Date()).toISOString(),
          });

          const workspaceId = getWorkspaceId?.();
          const event: RoundCompleteEvent = {
            type: ChatEventType.roundComplete,
            data: {
              round,
              resumed: pendingRound !== undefined,
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
  const resolvedToolCallSteps = resolvePausedToolCallSteps(pendingRound, events);

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

  const steps = eventsToSteps({
    events,
    compactionResult,
    relevantSkillsSelection,
    initialTodos,
  });

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
