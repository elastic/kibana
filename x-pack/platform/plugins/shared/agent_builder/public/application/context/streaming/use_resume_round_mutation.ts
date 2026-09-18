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
import type { PromptResponseEvent } from '@kbn/agent-builder-common';
import {
  EventActorType,
  TimelineEventType,
  isExecutionStartedEvent,
  isExecutionTerminatedEvent,
  parseExecutionId,
  promptResponseEventId,
} from '@kbn/agent-builder-common';
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

/**
 * The id the server will give the `prompt_response` event that resumes this paused run. The
 * resume is the next execution of the same round, and the id follows from that.
 */
const savedPromptResponseId = (pausedExecutionId: string): string | undefined => {
  const paused = parseExecutionId(pausedExecutionId);
  return paused ? promptResponseEventId(paused.roundId, paused.index + 1) : undefined;
};

const localPromptResponseEvent = ({
  id,
  promptRequestedEventId,
  prompts,
}: {
  id: string;
  promptRequestedEventId: string;
  prompts: Record<string, PromptResponse>;
}): PromptResponseEvent => ({
  id,
  type: TimelineEventType.promptResponse,
  created_at: new Date().toISOString(),
  actor: { type: EventActorType.user, id: '' },
  data: {
    prompt_requested_event_id: promptRequestedEventId,
    responses: prompts,
  },
});

export interface ResumeRoundVars {
  prompts: Record<string, PromptResponse>;
  /** The `execution_terminated` event that paused, which this answer joins back to. */
  promptRequestedEventId: string;
  /** The execution that paused; the resume is the next execution of its round. */
  pausedExecutionId: string;
  conversationId: string;
  agentId: string;
  connectorId?: string;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
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

      const localAnswerId = savedPromptResponseId(vars.pausedExecutionId);
      if (localAnswerId) {
        conversationStreamService.recordPromptResponse(
          vars.conversationId,
          localPromptResponseEvent({
            id: localAnswerId,
            promptRequestedEventId: vars.promptRequestedEventId,
            prompts: vars.prompts,
          })
        );
      }

      let timelineExecutionId: string | undefined;

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
              timelineExecutionId ??= event.execution_id;
            }
          })
        );

        // Failures are persisted by the server and arrive through the refetch below.
        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          browserApiTools: vars.browserApiTools,
          browserToolExecutor,
          isAborted: () => controller.signal.aborted,
        }).catch(() => {});

        // The resume never started, so nothing will ever save this answer: take it back.
        if (localAnswerId && !timelineExecutionId) {
          conversationStreamService.clearPromptResponse(vars.conversationId, localAnswerId);
        }

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
