/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { of, forkJoin, switchMap } from 'rxjs';
import type {
  ChatEvent,
  Conversation,
  ConversationAccessControl,
  ConversationRound,
  ConversationSource,
  RoundCompleteEvent,
  ConversationAction,
  RoundInput,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  createAskUserQuestionStep,
  getDefaultConversationAccessControl,
  isBackgroundAgentCompleteEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isPromptRequestEvent,
  isReasoningEvent,
  isTodosUpdatedEvent,
  isToolCallEvent,
  isToolCallStep,
  isToolProgressEvent,
  isToolResultEvent,
  isUserQuestionAskedEvent,
} from '@kbn/agent-builder-common';
import type { RuntimeAgentConfigurationOverrides } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents/prompts';
import {
  ConversationRoundStepType,
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type { ConversationClient } from '../../conversation';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';

const TEMPORARY_TITLE_MAX_LENGTH = 80;

export const getTemporaryConversationTitle = (message?: string): string => {
  const normalized = message?.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'New conversation';
  if (normalized.length <= TEMPORARY_TITLE_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, TEMPORARY_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
};

export const createInProgressRound = ({
  input,
  configurationOverrides,
}: {
  input: RoundInput;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
}): ConversationRound => {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    status: ConversationRoundStatus.inProgress,
    input,
    response: { message: '' },
    steps: [],
    started_at: now,
    time_to_first_token: 0,
    time_to_last_token: 0,
    model_usage: {
      connector_id: 'unknown',
      input_tokens: 0,
      output_tokens: 0,
      llm_calls: 0,
    },
    configuration_overrides: configurationOverrides,
  };
};

export const applyProgressEventToRound = ({
  round,
  event,
}: {
  round: ConversationRound;
  event: ChatEvent;
}): boolean => {
  if (isMessageChunkEvent(event)) {
    round.response.message += event.data.text_chunk;
    return true;
  }

  if (isMessageCompleteEvent(event)) {
    round.response = {
      message: event.data.message_content,
      structured_output: event.data.structured_output,
    };
    return true;
  }

  if (isReasoningEvent(event)) {
    if (event.data.transient) {
      return false;
    }
    round.response.message = '';
    round.steps.push(
      createReasoningStep({
        reasoning: event.data.reasoning,
        tool_call_id: event.data.tool_call_id,
        tool_call_group_id: event.data.tool_call_group_id,
      })
    );
    return true;
  }

  if (isToolCallEvent(event)) {
    round.steps.push(
      createToolCallStep({
        tool_id: event.data.tool_id,
        params: event.data.params,
        results: [],
        tool_call_id: event.data.tool_call_id,
        tool_call_group_id: event.data.tool_call_group_id,
        tool_origin: event.data.tool_origin,
        tool_type: event.data.tool_type,
      })
    );
    return true;
  }

  if (isToolProgressEvent(event)) {
    const step = round.steps
      .filter(isToolCallStep)
      .find((toolStep) => toolStep.tool_call_id === event.data.tool_call_id);
    if (!step) {
      return false;
    }
    step.progression = [
      ...(step.progression ?? []),
      {
        message: event.data.message,
        metadata: event.data.metadata,
      },
    ];
    return true;
  }

  if (isToolResultEvent(event)) {
    const step = round.steps
      .filter(isToolCallStep)
      .find((toolStep) => toolStep.tool_call_id === event.data.tool_call_id);
    if (!step) {
      return false;
    }
    step.results = event.data.results;
    return true;
  }

  if (isBackgroundAgentCompleteEvent(event)) {
    round.steps.push({
      type: ConversationRoundStepType.backgroundAgentComplete,
      ...event.data.execution,
    });
    return true;
  }

  if (isTodosUpdatedEvent(event)) {
    const existing = round.steps.find(
      (step) => step.type === ConversationRoundStepType.updateTodos
    );
    if (existing?.type === ConversationRoundStepType.updateTodos) {
      existing.todos = event.data.data.todos;
      existing.carried_over = false;
    } else {
      round.steps.push({
        type: ConversationRoundStepType.updateTodos,
        todos: event.data.data.todos,
      });
    }
    return true;
  }

  if (isPromptRequestEvent(event)) {
    round.pending_prompts = [...(round.pending_prompts ?? []), event.data.prompt];
    round.status = ConversationRoundStatus.awaitingPrompt;
    return true;
  }

  if (isUserQuestionAskedEvent(event)) {
    round.steps.push(
      createAskUserQuestionStep({
        prompt_id: event.data.prompt_id,
        questions: event.data.questions,
      })
    );
    const prompt = round.pending_prompts?.find(
      (pendingPrompt) =>
        isAskUserQuestionPrompt(pendingPrompt) && pendingPrompt.id === event.data.prompt_id
    );
    if (!prompt) {
      round.status = ConversationRoundStatus.awaitingPrompt;
    }
    return true;
  }

  return false;
};

export const createInProgressConversation = async ({
  conversation,
  conversationClient,
  round,
  title = conversation.title,
}: {
  conversation: Pick<Conversation, 'id' | 'agent_id' | 'access_control' | 'source' | 'title'>;
  conversationClient: ConversationClient;
  round: ConversationRound;
  title?: string;
}): Promise<Conversation> => {
  return conversationClient.create({
    id: conversation.id,
    title,
    agent_id: conversation.agent_id,
    access_control: conversation.access_control,
    source: conversation.source,
    status: round.status,
    read: false,
    rounds: [round],
  });
};

/**
 * Persist a new conversation and emit the corresponding event
 */
export const createConversation$ = ({
  conversation,
  conversationClient,
  title$,
  roundCompletedEvents$,
}: {
  conversation: Pick<Conversation, 'id' | 'agent_id' | 'access_control' | 'source'>;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      return conversationClient.create({
        id: conversation.id,
        title,
        agent_id: conversation.agent_id,
        access_control: conversation.access_control,
        source: conversation.source,
        state: roundCompletedEvent.data.conversation_state,
        status: roundCompletedEvent.data.round.status,
        read: false,
        rounds: [roundCompletedEvent.data.round],
        ...(roundCompletedEvent.data.attachments
          ? { attachments: roundCompletedEvent.data.attachments }
          : {}),
        ...(roundCompletedEvent.data.workspace_id
          ? { workspace_id: roundCompletedEvent.data.workspace_id }
          : {}),
      });
    }),
    switchMap((createdConversation) => {
      return of(createConversationCreatedEvent(createdConversation));
    })
  );
};

/**
 * Update an existing conversation and emit the corresponding event
 */
export const updateConversation$ = ({
  conversationClient,
  conversation,
  title$,
  roundCompletedEvents$,
  action,
}: {
  conversation: Conversation;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  conversationClient: ConversationClient;
  action?: ConversationAction;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      const { round, resumed = false, conversation_state } = roundCompletedEvent.data;
      // Replace last round when resumed (HITL flow), regenerate action is requested
      const shouldReplaceLastRound = resumed || action === 'regenerate';
      const updatedRound = shouldReplaceLastRound
        ? [...conversation.rounds.slice(0, -1), round]
        : [...conversation.rounds, round];

      // Only set workspace_id if it's new (once set it should not change).
      const newWorkspaceId =
        roundCompletedEvent.data.workspace_id && !conversation.workspace_id
          ? roundCompletedEvent.data.workspace_id
          : undefined;

      return conversationClient.update(
        {
          id: conversation.id,
          title,
          rounds: updatedRound,
          state: conversation_state,
          status: round.status,
          read: false,
          ...(roundCompletedEvent.data.attachments !== undefined
            ? { attachments: roundCompletedEvent.data.attachments }
            : {}),
          ...(newWorkspaceId ? { workspace_id: newWorkspaceId } : {}),
        },
        { access: 'converse' }
      );
    }),
    switchMap((updatedConversation) => {
      return of(createConversationUpdatedEvent(updatedConversation));
    })
  );
};

/**
 * Check if a conversation exists
 */
export const conversationExists = async ({
  conversationId,
  conversationClient,
}: {
  conversationId: string;
  conversationClient: ConversationClient;
}): Promise<boolean> => {
  return conversationClient.exists(conversationId);
};

export type ConversationOperation = 'CREATE' | 'UPDATE';

export type ConversationWithOperation = Conversation & { operation: ConversationOperation };

/**
 * Resolves the conversation to update, or returns a placeholder for one to create.
 * conversationId takes precedence over source. When no conversationId is provided,
 * source is used to find an existing conversation before creating a new placeholder.
 * autoCreateConversationWithId only applies when conversationId is provided: missing
 * conversations are created with that ID when enabled, and rejected by get() otherwise.
 * Note: Validation and manipulation for regenerate is handled in runDefaultAgentMode.
 */
export const getConversation = async ({
  agentId,
  conversationId,
  autoCreateConversationWithId = false,
  conversationClient,
  accessControl,
  source,
}: {
  agentId: string;
  conversationId: string | undefined;
  autoCreateConversationWithId?: boolean;
  conversationClient: ConversationClient;
  accessControl?: ConversationAccessControl;
  source?: ConversationSource;
}): Promise<ConversationWithOperation> => {
  // Case 1: No conversation ID - create new with placeholder
  if (!conversationId) {
    const conversation = source ? await conversationClient.getBySource(source) : undefined;

    if (conversation) {
      return {
        ...conversation,
        operation: 'UPDATE',
      };
    }

    return {
      ...placeholderConversation({ agentId, accessControl, source }),
      operation: 'CREATE',
    };
  }

  // Case 2: Conversation ID specified and autoCreate is false - update existing
  if (!autoCreateConversationWithId) {
    return {
      ...(await conversationClient.get(conversationId)),
      operation: 'UPDATE',
    };
  }

  // Case 3: Conversation ID specified and autoCreate is true - check if exists
  const exists = await conversationExists({ conversationId, conversationClient });
  if (exists) {
    return {
      ...(await conversationClient.get(conversationId)),
      operation: 'UPDATE',
    };
  } else {
    return {
      ...placeholderConversation({ conversationId, agentId, accessControl, source }),
      operation: 'CREATE',
    };
  }
};

export const placeholderConversation = ({
  agentId,
  conversationId,
  accessControl,
  source,
}: {
  agentId: string;
  conversationId?: string;
  accessControl?: ConversationAccessControl;
  source?: ConversationSource;
}): Conversation => {
  return {
    id: conversationId ?? uuidv4(),
    title: 'New conversation',
    agent_id: agentId,
    access_control: accessControl ?? getDefaultConversationAccessControl(),
    rounds: [],
    ...(source ? { source } : {}),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user: {
      id: 'unknown',
      username: 'unknown',
    },
  };
};
