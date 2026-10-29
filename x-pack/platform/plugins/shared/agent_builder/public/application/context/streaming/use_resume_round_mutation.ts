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
  isExecutionTerminalEvent,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { PromptResponseEvent } from '@kbn/agent-builder-common';
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
import { isStreamCancelled, requestAbort, type StreamHandle } from './stream_handle';

/** Placeholder id of the answer until `execution_started` reveals the saved one. */
const PENDING_PROMPT_RESPONSE_ID = 'pending::prompt_response';

export interface ResumeRoundVars {
  prompts: Record<string, PromptResponse>;
  conversationId: string;
  agentId: string;
  connectorId?: string;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  promptRequestedEventId: string;
}

export interface ResumeRoundMutationBindings {
  conversationStreamService: ConversationStreamService;
  clearActiveStream: (conversationId: string) => void;
  markStreamStarted: (conversationId: string) => void;
}

type UseResumeRoundMutationProps = ResumeRoundMutationBindings;

/**
 * Resume mutation, used after a HITL pause when the user clicks Approve / Cancel on a
 * `ConfirmationPrompt`. Same single-scope `mutationFn` shape as the send mutation.
 */
export const useResumeRoundMutation = ({
  conversationStreamService,
  clearActiveStream,
  markStreamStarted,
}: UseResumeRoundMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  // One controller + executionId per in-flight conversation. Concurrent streams need
  // independent cancel; the executionId is what the abort endpoint uses to stop server-side.
  // `useResumeRoundMutation` is called exactly once — by the `StreamingProvider`.
  const controllersRef = useRef<Map<string, StreamHandle>>(new Map());

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
      const handle: StreamHandle = { controller, executionId, abortRequested: false };
      controllersRef.current.set(vars.conversationId, handle);

      // The optimistic answer starts under a placeholder id; `execution_started` renames it to the
      // saved one (its `trigger_event_id`), so the saved twin replaces it after the refetch.
      let optimisticId = PENDING_PROMPT_RESPONSE_ID;
      const optimisticResponse: PromptResponseEvent = {
        id: optimisticId,
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
            if (isExecutionStartedEvent(event)) {
              markStreamStarted(vars.conversationId);
              // The resume's trigger is the saved prompt_response: rename the optimistic copy to
              // that id so the saved twin replaces it, like the pending user message.
              if (event.trigger_event_id && optimisticId === PENDING_PROMPT_RESPONSE_ID) {
                conversationStreamService.clearPromptResponse(vars.conversationId, optimisticId);
                optimisticId = event.trigger_event_id;
                conversationStreamService.recordPromptResponse(vars.conversationId, {
                  ...optimisticResponse,
                  id: optimisticId,
                });
              }
            }
            if (isExecutionStartedEvent(event) || isExecutionTerminalEvent(event)) {
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
          isAborted: () => isStreamCancelled(handle),
        }).catch(() => {
          if (!streamEventArrived) {
            conversationStreamService.clearPromptResponse(vars.conversationId, optimisticId);
          }
        });

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
          conversationStreamService.clearPromptResponse(vars.conversationId, optimisticId);
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
      const handle = controllersRef.current.get(conversationId);
      if (handle) {
        requestAbort(handle, chatService);
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
