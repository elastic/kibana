/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toToolMetadata } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import {
  isExecutionStartedEvent,
  isExecutionTerminatedEvent,
  EventActorType,
  TimelineEventType,
  promptResponseEventId,
  nextResumeIndexFromEvents,
} from '@kbn/agent-builder-common';
import type { Conversation, PromptResponseEvent } from '@kbn/agent-builder-common';
import { tap } from 'rxjs';
import type { PromptResponse } from '@kbn/agent-builder-common/agents';
import { useKibana } from '../../hooks/use_kibana';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';
import { createConversationActions } from '../conversation/use_conversation_actions';
import type { ConversationStreamService } from '../../../services/events';
import { releaseLocalContent } from './release_local_content';
import { mergeEventsById } from '../../components/conversations/timeline/merge_events';
import { queryKeys } from '../../query_keys';

export interface ResumeRoundVars {
  prompts: Record<string, PromptResponse>;
  conversationId: string;
  agentId: string;
  connectorId?: string;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  promptRequestedEventId: string;
  roundId: string;
}

export interface ResumeRoundMutationBindings {
  conversationStreamService: ConversationStreamService;
  clearActiveStream: (conversationId: string) => void;
}

type UseResumeRoundMutationProps = ResumeRoundMutationBindings;

/**
 * Resume mutation, used after a HITL pause when the user clicks Approve / Cancel on a
 * `ConfirmationPrompt`. Same single-scope `mutationFn` shape as the send mutation.
 */
export const useResumeRoundMutation = ({
  conversationStreamService,
  clearActiveStream,
}: UseResumeRoundMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  // One controller + executionId per in-flight conversation. Concurrent streams need
  // independent cancel; the executionId is what the abort endpoint uses to stop server-side.
  // `useResumeRoundMutation` is called exactly once — by the `StreamingProvider`.
  const controllersRef = useRef<Map<string, { controller: AbortController; executionId: string }>>(
    new Map()
  );

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.resumeRound,
    mutationFn: async (vars: ResumeRoundVars) => {
      const streamActions = createConversationActions({
        conversationId: vars.conversationId,
        queryClient,
        conversationsService,
      });

      const previous = controllersRef.current.get(vars.conversationId);
      if (previous) {
        chatService.abort(previous.executionId).catch(() => {});
        previous.controller.abort();
      }
      const controller = new AbortController();
      const executionId = uuidv4();
      controllersRef.current.set(vars.conversationId, { controller, executionId });

      // The optimistic answer takes the id the server will write, so the saved twin replaces it
      // after the refetch. The index counts the round's stored executions, same as the server.
      const cachedConversation = queryClient.getQueryData<Conversation>(
        queryKeys.conversations.byId(vars.conversationId)
      );
      const liveEvents = conversationStreamService.getSnapshot(vars.conversationId);
      const mergedEvents = mergeEventsById(cachedConversation?.events ?? [], liveEvents);
      const executionIndex = nextResumeIndexFromEvents(mergedEvents, vars.roundId);
      const predictedId = promptResponseEventId(vars.roundId, executionIndex);

      const optimisticResponse: PromptResponseEvent = {
        id: predictedId,
        type: TimelineEventType.promptResponse,
        created_at: new Date().toISOString(),
        actor: { type: EventActorType.user, id: 'optimistic' },
        data: {
          prompt_requested_event_id: vars.promptRequestedEventId,
          responses: vars.prompts,
        },
      };
      conversationStreamService.recordPromptResponse(vars.conversationId, optimisticResponse);

      let timelineExecutionId: string | undefined;
      let streamEventArrived = false;

      try {
        const browserApiToolsMetadata = vars.browserApiTools?.map(toToolMetadata);

        const rawEvents$ = chatService.resume({
          signal: controller.signal,
          executionId,
          prompts: vars.prompts,
          conversationId: vars.conversationId,
          agentId: vars.agentId,
          connectorId: vars.connectorId,
          browserApiTools: browserApiToolsMetadata,
          projectRouting: services.plugins.cps?.cpsManager?.getProjectRouting(),
        });

        const events$ = rawEvents$.pipe(
          tap((event) => {
            if (isExecutionStartedEvent(event) || isExecutionTerminatedEvent(event)) {
              streamEventArrived = true;
              timelineExecutionId ??= event.execution_id;
            }
          })
        );

        // Failures are persisted by the server and arrive through the refetch below. A failure
        // before any stream event means the resume never started: roll back the optimistic answer.
        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          browserApiTools: vars.browserApiTools,
          browserToolExecutor,
          isAborted: () => controller.signal.aborted,
        }).catch(() => {
          if (!streamEventArrived) {
            conversationStreamService.clearPromptResponse(vars.conversationId, predictedId);
          }
        });

        clearActiveStream(vars.conversationId);
        await releaseLocalContent({
          refetch: streamActions.refetchConversation,
          executionId: timelineExecutionId,
          clearExecution: (persistedExecutionId) =>
            conversationStreamService.clearPersistedExecution(
              vars.conversationId,
              persistedExecutionId
            ),
        });
      } catch (err) {
        if (!streamEventArrived) {
          conversationStreamService.clearPromptResponse(vars.conversationId, predictedId);
        }
        throw err;
      } finally {
        clearActiveStream(vars.conversationId);
        if (controllersRef.current.get(vars.conversationId)?.controller === controller) {
          controllersRef.current.delete(vars.conversationId);
        }
      }
    },
  });

  const cancel = useCallback(
    (conversationId: string) => {
      const entry = controllersRef.current.get(conversationId);
      if (entry) {
        chatService.abort(entry.executionId).catch(() => {});
        entry.controller.abort();
      }
    },
    [chatService]
  );

  const cancelAll = useCallback(() => {
    for (const { controller, executionId } of controllersRef.current.values()) {
      chatService.abort(executionId).catch(() => {});
      controller.abort();
    }
  }, [chatService]);

  return {
    mutate,
    isLoading,
    cancel,
    cancelAll,
  };
};
