/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useRef } from 'react';
import { tap } from 'rxjs';
import {
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
  isExecutionStartedEvent,
  isExecutionTerminalEvent,
  isTimelineEvent,
} from '@kbn/agent-builder-common';
import type { Conversation, ExecutionStartedEvent } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { queryKeys } from '../../query_keys';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';
import { createConversationActions } from '../conversation/use_conversation_actions';
import type { ConversationStreamService } from '../../../services/events';
import { releaseLocalContent } from './release_local_content';
import { isDetached, isStreamCancelled, requestAbort, type StreamHandle } from './stream_handle';
import { findAwaitingPromptEventId } from '../../components/conversations/timeline/awaiting_prompt';
import { mergeEventsById } from '../../components/conversations/timeline/merge_events';

export interface AttachExecutionVars {
  conversationId: string;
  executionId: string;
}

export interface AttachExecutionMutationBindings {
  conversationStreamService: ConversationStreamService;
  clearActiveStream: (conversationId: string) => void;
  markStreamStarted: (conversationId: string) => void;
}

/**
 * Attach mutation: follows an execution this copy of the UI did not start, found through the
 * conversation's `active_execution` pointer after a reload, on return, or in a shared
 * conversation. The replay from the start rebuilds the running turn; the live tail continues it.
 * Same single-scope `mutationFn` shape as the send and resume mutations, without a message to
 * send, an answer to record up front, or browser tools to run.
 */
export const useAttachExecutionMutation = ({
  conversationStreamService,
  clearActiveStream,
  markStreamStarted,
}: AttachExecutionMutationBindings) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  // One controller per attached conversation; the execution id is the one we attached to, so
  // Stop aborts that run. `useAttachExecutionMutation` is called exactly once, by the provider.
  const controllersRef = useRef<Map<string, StreamHandle>>(new Map());

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.attachExecution,
    mutationFn: async (vars: AttachExecutionVars) => {
      const streamActions = createConversationActions({
        conversationId: vars.conversationId,
        queryClient,
        conversationsService,
      });

      const controller = new AbortController();
      const handle: StreamHandle = {
        controller,
        executionId: vars.executionId,
        abortRequested: false,
      };
      controllersRef.current.set(vars.conversationId, handle);

      // A resume's `execution_started` points at the `prompt_response` the server persists only
      // when the run completes. Record it locally now, under that id, so the resumed run links to
      // its turn and the prompt no longer reads as awaiting; the saved copy replaces it after the
      // refetch. The answer values are unknown here, so they stay blank until then.
      const recordPromptResponse = (event: ExecutionStartedEvent) => {
        const saved = (
          queryClient.getQueryData<Conversation>(queryKeys.conversations.byId(vars.conversationId))
            ?.events ?? []
        ).filter(isTimelineEvent);
        const live = conversationStreamService.getSnapshot(vars.conversationId);
        const promptRequestedEventId = findAwaitingPromptEventId(mergeEventsById(saved, live));
        if (!event.trigger_event_id || !promptRequestedEventId) {
          return;
        }
        conversationStreamService.recordPromptResponse(vars.conversationId, {
          id: event.trigger_event_id,
          type: TimelineEventType.promptResponse,
          created_at: new Date().toISOString(),
          actor: { type: EventActorType.user, id: '' },
          data: { prompt_requested_event_id: promptRequestedEventId, responses: {} },
        });
      };

      let timelineExecutionId: string | undefined;

      try {
        const events$ = chatService
          .attachToExecution({
            signal: controller.signal,
            conversationId: vars.conversationId,
            executionId: vars.executionId,
          })
          .pipe(
            conversationStreamService.trackStream(vars.conversationId),
            tap((event) => {
              if (isExecutionStartedEvent(event)) {
                markStreamStarted(vars.conversationId);
                if (event.data.trigger_type === TimelineTriggerType.promptResponse) {
                  recordPromptResponse(event);
                }
              }
              if (isExecutionStartedEvent(event) || isExecutionTerminalEvent(event)) {
                timelineExecutionId ??= event.execution_id;
              }
            })
          );

        // A pointer to a finished, missing or dead execution is a timing or cleanup artefact, not
        // something to report: the turn stays as the GET left it and the refetch below settles it.
        // No browser tools either; the UI that started the run is the one that executes them.
        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          isAborted: () => isStreamCancelled(handle),
        }).catch(() => {});

        // The connection closed because the view was unmounted, not because the run ended: skip the end-of-run handling.
        if (isDetached(handle)) {
          return;
        }

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
      const handle = controllersRef.current.get(conversationId);
      if (handle) {
        requestAbort(handle, chatService);
      }
    },
    [chatService]
  );

  /** Closes every connection locally; the runs keep going on the server. */
  const detachAll = useCallback(() => {
    for (const { controller } of controllersRef.current.values()) {
      controller.abort();
    }
  }, []);

  return {
    mutate,
    isLoading,
    cancel,
    detachAll,
  };
};
